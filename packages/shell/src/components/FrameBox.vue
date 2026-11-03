<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { PROTOCOL, isProtocolMessage, type Frame } from '@moorp/core'
import { api, checkFrame } from '../api'
import { commit, copyFrame, patchFrame, removeFrame, state } from '../store'

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
      { protocol: PROTOCOL, type: 'init', frameId: f.id, source: plain(f.source), scenario: f.scenario, hug: hugW.value || hugH.value, presentation: plain(f.presentation) },
      '*',
    )
  }
}

watch(
  () => props.frame.presentation,
  (presentation) => {
    if (isDesign.value && props.frame.source) {
      iframe.value?.contentWindow?.postMessage({ protocol: PROTOCOL, type: 'update', frameId: props.frame.id, presentation: plain(presentation) }, '*')
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
  else if (m.type === 'zoom') {
    // Iframe coordinates -> screen coordinates: offset by the iframe's rect plus the canvas scale.
    const r = iframe.value!.getBoundingClientRect()
    emit('zoom', r.left + m.clientX * state.view.s, r.top + m.clientY * state.view.s, m.deltaY)
  }
}
onMounted(() => window.addEventListener('message', onMessage))
onUnmounted(() => window.removeEventListener('message', onMessage))

// ---- drag to move (toolbar) and resize (handles) ----------------------------------------------

function drag(e: PointerEvent, onMove: (dx: number, dy: number) => void) {
  const el = e.currentTarget as HTMLElement
  el.setPointerCapture(e.pointerId)
  state.dragging = true
  let lx = e.clientX
  let ly = e.clientY
  const move = (m: PointerEvent) => {
    onMove((m.clientX - lx) / state.view.s, (m.clientY - ly) / state.view.s)
    lx = m.clientX
    ly = m.clientY
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
  drag(e, (dx, dy) => patchFrame(props.frame.id, { x: Math.round(props.frame.x + dx), y: Math.round(props.frame.y + dy) }, { save: false }))
}

function startResize(e: PointerEvent, axis: 'x' | 'y' | 'xy') {
  state.selected = props.frame.id
  // Resizing a hug frame turns that dimension into a fixed one, starting from the size it has now.
  let w = width.value
  let h = height.value
  drag(e, (dx, dy) => {
    if (axis !== 'y') w = Math.max(40, w + dx)
    if (axis !== 'x') h = Math.max(40, h + dy)
    patchFrame(props.frame.id, { ...(axis !== 'y' ? { width: Math.round(w) } : {}), ...(axis !== 'x' ? { height: Math.round(h) } : {}) }, { save: false })
  })
}

// ---- title rename and actions -----------------------------------------------------------------

const renaming = ref(false)
const nameDraft = ref('')
const nameInput = ref<HTMLInputElement | null>(null)
async function startRename() {
  nameDraft.value = props.frame.name
  renaming.value = true
  await nextTick()
  nameInput.value?.focus()
  nameInput.value?.select()
}
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
  <div class="frame" :class="{ selected }" :style="{ left: frame.x + 'px', top: frame.y + 'px', width: width + 'px' }">
    <div class="bar" @pointerdown="startMove" @dblclick="startRename">
      <input
        v-if="renaming"
        ref="nameInput"
        v-model="nameDraft"
        @pointerdown.stop
        @keydown.enter="finishRename(true)"
        @keydown.esc="finishRename(false)"
        @blur="finishRename(true)"
      />
      <span v-else class="title" :title="frame.id">{{ frame.name }}</span>
      <span class="actions" @pointerdown.stop>
        <button v-if="frame.source" title="Open source in editor" @click="openSource">Open source</button>
        <button title="Duplicate frame (source files are not copied)" @click="copyFrame(frame.id)">Duplicate</button>
        <button title="Remove from canvas (source files are not deleted)" @click="removeFrame(frame.id)">Delete</button>
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
