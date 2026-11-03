<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { PROTOCOL, isProtocolMessage, type Frame } from '@moorp/core'
import { api, checkFrame } from '../api'
import { beginGesture, commit, copyFrame, duplicateInPlace, patchFrame, removeFrame, runAction, state } from '../store'
import { matchShortcut } from '../shortcuts.ts'
import { Copy, ExternalLink, Frame as FrameIcon, Monitor, Trash2 } from 'lucide-vue-next'
import Button from '@/components/ui/Button.vue'
import Input from '@/components/ui/Input.vue'
import Tooltip from '@/components/ui/Tooltip.vue'

const props = defineProps<{ frame: Frame }>()
const emit = defineEmits<{ zoom: [clientX: number, clientY: number, deltaY: number] }>()

const iframe = ref<HTMLIFrameElement | null>(null)

/** postMessage needs structured-cloneable data, and Vue's reactive proxies are not. */
const plain = <T,>(v: T): T => (v === undefined ? v : (JSON.parse(JSON.stringify(v)) as T))
const selected = computed(() => state.selected === props.frame.id)

const isDesign = computed(() => props.frame.type === 'design')
const blank = computed(() => isDesign.value && !props.frame.source)
const hugW = computed(() => isDesign.value && !blank.value && props.frame.width === 'hug')
const hugH = computed(() => isDesign.value && !blank.value && props.frame.height === 'hug')

// A hug frame starts large so its content is measured unconstrained, then shrinks to the size the preview reports.
const measured = ref<{ w: number; h: number } | null>(null)
const width = computed(() => (typeof props.frame.width === 'number' ? props.frame.width : blank.value ? 240 : (measured.value?.w ?? 2000)))
const height = computed(() => (typeof props.frame.height === 'number' ? props.frame.height : blank.value ? 120 : (measured.value?.h ?? 2000)))

// Anything that needs a fresh preview document.
const reloadKey = computed(() => JSON.stringify([props.frame.type, props.frame.url, props.frame.source, props.frame.scenario, hugW.value, hugH.value]))
watch(reloadKey, () => {
  measured.value = null
  previewError.value = ''
})

const src = computed(() => (isDesign.value ? '/__moorp/preview.html' : (props.frame.url ?? 'about:blank')))
const previewError = ref('')

function init() {
  const f = props.frame
  if (isDesign.value && f.source) {
    iframe.value?.contentWindow?.postMessage(
      { protocol: PROTOCOL, type: 'init', frameId: f.id, source: plain(f.source), scenario: f.scenario, hug: hugW.value || hugH.value, presentation: plain(f.presentation), props: plain(f.props) },
      '*',
    )
  }
}

// Presentation and props change in place: the component is updated, not remounted.
watch(
  () => [props.frame.presentation, props.frame.props],
  () => {
    if (isDesign.value && props.frame.source) {
      iframe.value?.contentWindow?.postMessage(
        { protocol: PROTOCOL, type: 'update', frameId: props.frame.id, presentation: plain(props.frame.presentation), props: plain(props.frame.props) },
        '*',
      )
    }
  },
  { deep: true },
)

// Page frames: say why a page cannot be embedded (the browser only shows a blank frame).
const blocked = ref('')
watch(
  () => (props.frame.type === 'page' ? props.frame.url : null),
  async (url) => {
    blocked.value = ''
    if (!url) return
    try {
      const r = await checkFrame(url)
      if (!r.embeddable) blocked.value = `Cannot embed ${url}: ${r.reason}`
    } catch {
      /* a failed check is not an error worth showing */
    }
  },
  { immediate: true },
)

function onMessage(e: MessageEvent) {
  if (e.source !== iframe.value?.contentWindow || !isProtocolMessage(e.data)) return
  const m = e.data
  if (m.type === 'size') {
    if (hugW.value || hugH.value) measured.value = { w: Math.ceil(m.width), h: Math.ceil(m.height) }
  } else if (m.type === 'error') previewError.value = m.message
  else if (m.type === 'ready') previewError.value = ''
  else if (m.type === 'key') {
    // A shortcut pressed while a component had focus: handle it exactly like one pressed in the shell.
    const action = matchShortcut(m)
    if (action) runAction(action)
  } else if (m.type === 'zoom') {
    // Iframe coordinates -> screen coordinates: offset by the iframe's rect plus the canvas scale.
    const r = iframe.value!.getBoundingClientRect()
    emit('zoom', r.left + m.clientX * state.view.s, r.top + m.clientY * state.view.s, m.deltaY)
  }
}
onMounted(() => window.addEventListener('message', onMessage))
onUnmounted(() => window.removeEventListener('message', onMessage))

// ---- drag to move (toolbar) and resize (handles) ----------------------------------------------

/** Pointer gesture on this frame. `onMove` gets the total movement since the pointer went down, in canvas pixels. */
function drag(e: PointerEvent, onMove: (total: { x: number; y: number }, ev: PointerEvent) => void, onStart?: () => void) {
  const el = e.currentTarget as HTMLElement
  el.setPointerCapture(e.pointerId)
  state.dragging = true
  const x0 = e.clientX
  const y0 = e.clientY
  let started = false
  const move = (m: PointerEvent) => {
    // The first real movement opens the undo step (a plain click only selects), and the whole drag is that one step.
    if (!started) {
      started = true
      beginGesture()
      onStart?.()
    }
    onMove({ x: (m.clientX - x0) / state.view.s, y: (m.clientY - y0) / state.view.s }, m)
  }
  const up = () => {
    state.dragging = false
    el.removeEventListener('pointermove', move)
    el.removeEventListener('pointerup', up)
    commit()
  }
  el.addEventListener('pointermove', move)
  el.addEventListener('pointerup', up)
}

function startMove(e: PointerEvent) {
  state.selected = props.frame.id
  const { x: startX, y: startY, id } = props.frame
  drag(
    e,
    (t, ev) => {
      let { x, y } = t
      // Shift (Figma): constrain to the dominant axis.
      if (ev.shiftKey) Math.abs(x) >= Math.abs(y) ? (y = 0) : (x = 0)
      patchFrame(id, { x: Math.round(startX + x), y: Math.round(startY + y) }, { save: false })
    },
    // Alt (Figma): leave a copy behind and keep dragging the original.
    e.altKey ? () => duplicateInPlace(id) : undefined,
  )
}

function startResize(e: PointerEvent, axis: 'x' | 'y' | 'xy') {
  state.selected = props.frame.id
  // Resizing a hug frame turns that dimension into a fixed one, starting from the size it has now.
  const w0 = width.value
  const h0 = height.value
  const id = props.frame.id
  drag(e, (t, ev) => {
    let w = Math.max(40, w0 + (axis !== 'y' ? t.x : 0))
    let h = Math.max(40, h0 + (axis !== 'x' ? t.y : 0))
    // Shift on the corner (Figma): keep the proportions.
    if (ev.shiftKey && axis === 'xy') {
      const ratio = w0 / h0
      if (Math.abs(t.x) >= Math.abs(t.y) * ratio) h = Math.max(40, w / ratio)
      else w = Math.max(40, h * ratio)
    }
    patchFrame(id, { ...(axis !== 'y' ? { width: Math.round(w) } : {}), ...(axis !== 'x' ? { height: Math.round(h) } : {}) }, { save: false })
  })
}

// ---- title rename and actions -----------------------------------------------------------------

const renaming = ref(false)
const nameDraft = ref('')
const nameInput = ref<{ $el: HTMLInputElement } | null>(null)
async function startRename() {
  nameDraft.value = props.frame.name
  renaming.value = true
  await nextTick()
  nameInput.value?.$el.focus()
  nameInput.value?.$el.select()
}
watch(
  () => state.renaming,
  (id) => {
    if (id === props.frame.id) {
      state.renaming = null
      void startRename()
    }
  },
)
function finishRename(apply: boolean) {
  if (!renaming.value) return
  renaming.value = false
  const name = nameDraft.value.trim()
  if (apply && name && name !== props.frame.name) patchFrame(props.frame.id, { name })
}

async function openSource() {
  if (!props.frame.source) return
  try {
    await api.openSource(props.frame.source.file)
  } catch (e) {
    state.error = `Open source failed: ${e instanceof Error ? e.message : e}`
  }
}
</script>

<template>
  <div class="frame" :data-id="frame.id" :class="{ selected }" :style="{ left: frame.x + 'px', top: frame.y + 'px', width: width + 'px' }">
    <!-- Framer-style header: always black, as wide as the frame. Type chip, name and width on the left, actions on the right.
         Parts drop out as the bar gets narrow (container queries), so small frames at low zoom stay clean. -->
    <div
      class="bar @container/bar flex h-9 items-center gap-2 rounded-xl bg-neutral-950 p-1 shadow-[0_0_0_1px_var(--neutral-800)]"
      @pointerdown="startMove"
      @dblclick="startRename"
    >
      <span
        class="grid size-7 shrink-0 place-items-center rounded-lg"
        :class="selected ? 'bg-brand fg-brand-on' : 'bg-white/10 text-neutral-300'"
        :title="frame.type === 'page' ? 'Page frame' : 'Design frame'"
      >
        <Monitor v-if="frame.type === 'page'" class="size-4" />
        <FrameIcon v-else class="size-4" />
      </span>
      <Input
        v-if="renaming"
        ref="nameInput"
        v-model="nameDraft"
        class="h-7 w-40 min-w-0 border-neutral-700 bg-neutral-900 px-1.5 py-0.5 text-xs text-neutral-100 focus-visible:bg-neutral-900"
        @pointerdown.stop
        @keydown.enter="finishRename(true)"
        @keydown.esc="finishRename(false)"
        @blur="finishRename(true)"
      />
      <template v-else>
        <span class="type-body-m-semibold min-w-0 truncate" :class="selected ? 'text-neutral-50' : 'text-neutral-400'" :title="frame.id">{{ frame.name }}</span>
        <span class="type-code-s hidden shrink-0 text-neutral-500 @[220px]/bar:inline">{{ Math.round(width) }}</span>
      </template>
      <span class="ml-auto flex shrink-0 items-center gap-0.5 @max-[130px]/bar:hidden" @pointerdown.stop>
        <Tooltip v-if="frame.source" text="Open source in editor">
          <Button variant="ghost" size="icon-sm" class="text-neutral-300 hover:bg-white/10 hover:text-white" aria-label="Open source in editor" @click="openSource"><ExternalLink /></Button>
        </Tooltip>
        <Tooltip text="Duplicate" shortcut="⌘D">
          <Button variant="ghost" size="icon-sm" class="text-neutral-300 hover:bg-white/10 hover:text-white" aria-label="Duplicate frame (source files are not copied)" @click="copyFrame(frame.id)"><Copy /></Button>
        </Tooltip>
        <Tooltip text="Remove from canvas" shortcut="⌫">
          <Button variant="ghost" size="icon-sm" class="text-neutral-300 hover:bg-white/10 hover:text-white" aria-label="Remove from canvas (source files are not deleted)" @click="removeFrame(frame.id)"><Trash2 /></Button>
        </Tooltip>
      </span>
    </div>

    <div class="body" :style="{ width: width + 'px', height: height + 'px' }">
      <iframe
        :key="reloadKey"
        ref="iframe"
        :src="src"
        :data-frame-id="frame.id"
        :style="{ background: frame.type === 'page' ? '#fff' : 'transparent' }"
        @load="init"
      />
      <div v-if="blank" class="overlay muted">No source bound. Set one in the properties panel.</div>
      <div v-if="blocked" class="overlay error">{{ blocked }}</div>
      <div v-else-if="previewError" class="overlay error">{{ previewError }}</div>
      <template v-if="selected">
        <div class="handle r" @pointerdown.stop="startResize($event, 'x')" />
        <div class="handle b" @pointerdown.stop="startResize($event, 'y')" />
        <div class="handle c" @pointerdown.stop="startResize($event, 'xy')" />
      </template>
    </div>
  </div>
</template>
