<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Presentation } from '@moorp/core'
import { Copy, ExternalLink, Focus, Trash2 } from 'lucide-vue-next'
import { copyFrame, deleteCanvas, fitFrames, openFrameSource, patchFrame, removeFrame, resetView, selectedFrame as frame, state } from '../store'
import PanelSection from './PanelSection.vue'
import Badge from '@/components/ui/Badge.vue'
import Button from '@/components/ui/Button.vue'
import Input from '@/components/ui/Input.vue'
import Kbd from '@/components/ui/Kbd.vue'
import Label from '@/components/ui/Label.vue'
import Select from '@/components/ui/Select.vue'
import Textarea from '@/components/ui/Textarea.vue'

const isDesign = computed(() => frame.value?.type === 'design')
const presets = [
  { label: 'Mobile', width: 375, height: 640 },
  { label: 'Tablet', width: 768, height: 1024 },
  { label: 'Laptop', width: 1280, height: 800 },
  { label: 'Desktop', width: 1440, height: 900 },
]

const id = () => frame.value!.id
const num = (e: Event) => Math.max(40, Math.round(Number((e.target as HTMLInputElement).value) || 40))
const setPres = (p: Presentation) => patchFrame(id(), { presentation: p })

function setSize(axis: 'width' | 'height', mode: string) {
  patchFrame(id(), { [axis]: mode === 'hug' ? 'hug' : axis === 'width' ? 240 : 120 })
}

function setSource(e: Event) {
  const file = (e.target as HTMLInputElement).value.trim()
  patchFrame(id(), { source: file ? { file } : null })
}

function setUrl(e: Event) {
  patchFrame(id(), { url: (e.target as HTMLInputElement).value.trim() || '/' })
}

function removeCanvas() {
  const path = state.current
  if (path && window.confirm(`Delete canvas “${path}”? Source files are not touched.`)) void deleteCanvas(path)
}

// Props are edited as JSON text; only a valid object replaces the frame's props.
const propsText = ref('')
const propsError = ref('')
watch(
  () => [frame.value?.id, JSON.stringify(frame.value?.props ?? null)],
  () => {
    propsText.value = frame.value?.props ? JSON.stringify(frame.value.props, null, 2) : ''
    propsError.value = ''
  },
  { immediate: true },
)
function setProps() {
  const text = propsText.value.trim()
  if (!text) {
    propsError.value = ''
    return patchFrame(id(), { props: undefined })
  }
  try {
    const value = JSON.parse(text) as unknown
    if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('Props must be a JSON object, like { "isDark": true }')
    propsError.value = ''
    patchFrame(id(), { props: Object.keys(value).length ? (value as Record<string, unknown>) : undefined })
  } catch (e) {
    propsError.value = e instanceof Error ? e.message : String(e)
  }
}

/** The `class` attribute on the preview's <html> element (e.g. Tailwind's `dark`); other attributes stay as they are in the file. */
function setHtmlClass(e: Event) {
  const value = (e.target as HTMLInputElement).value.trim()
  const attrs = { ...frame.value?.presentation?.htmlAttributes }
  if (value) attrs.class = value
  else delete attrs.class
  setPres({ htmlAttributes: Object.keys(attrs).length ? attrs : undefined })
}

const padding = computed(() => frame.value?.presentation?.padding ?? 0)

// Select options. Option values cannot be empty strings, so "unset" has a name ("default", "visible").
const sizeModes = [
  { value: 'hug', label: 'Hug' },
  { value: 'fixed', label: 'Fixed' },
]
const alignmentOptions = [
  { value: 'default', label: 'Default' },
  { value: 'start', label: 'Start' },
  { value: 'center', label: 'Center' },
  { value: 'end', label: 'End' },
]
const overflowOptions = [
  { value: 'visible', label: 'Visible' },
  { value: 'hidden', label: 'Hidden' },
  { value: 'scroll', label: 'Scroll' },
]
const paddingOptions = computed(() => {
  const values = [0, 8, 16, 24, 32]
  if (!values.includes(padding.value)) values.push(padding.value)
  return values.sort((a, b) => a - b).map((v) => ({ value: String(v), label: `${v}px` }))
})

const text = (e: Event) => (e.target as HTMLInputElement).value.trim()

const shortcuts: [string, string[]][] = [
  ['Undo, redo', ['⌘Z', '⇧⌘Z']],
  ['Duplicate', ['⌘D', 'Alt+drag']],
  ['Copy, paste', ['⌘C', '⌘V']],
  ['Rename', ['⌘R']],
  ['Delete, deselect', ['⌫', 'Esc']],
  ['Nudge 1 / 10 px', ['Arrows', '⇧ Arrows']],
  ['Next frame', ['Tab', '⇧Tab']],
  ['Fit, selection, 100%', ['⇧1', '⇧2', '⇧0']],
  ['Zoom in, out', ['⌘+', '⌘−']],
  ['Pan', ['Space+drag']],
  ['Constrain, keep ratio', ['⇧ drag']],
  ['Add design frame', ['F']],
  ['Hide panels', ['⌘\\']],
]
</script>

<template>
  <aside class="panel bg-base flex min-w-0 flex-col overflow-auto border-l">
    <template v-if="frame">
      <header class="flex flex-col gap-1.5 border-b p-3">
        <div class="flex items-center justify-between gap-2">
          <strong class="type-heading-4 truncate">{{ frame.name }}</strong>
          <Badge :variant="isDesign ? 'indigo' : 'teal'">{{ frame.type }}</Badge>
        </div>
        <span class="type-code-xs fg-ghost">{{ frame.id }}</span>
      </header>

      <PanelSection>
        <div class="flex flex-col gap-1.5">
          <Label for="p-name">Name</Label>
          <Input id="p-name" :model-value="frame.name" @change="patchFrame(id(), { name: text($event) || frame.name })" />
        </div>
      </PanelSection>

      <PanelSection title="Source">
        <div v-if="isDesign" class="flex flex-col gap-1.5">
          <Label for="p-source">Component file</Label>
          <Input id="p-source" :model-value="frame.source?.file ?? ''" placeholder="src/components/Card.vue" @change="setSource" />
        </div>
        <div v-else class="flex flex-col gap-1.5">
          <Label for="p-url">URL or route</Label>
          <Input id="p-url" :model-value="frame.url ?? ''" placeholder="/" @change="setUrl" />
        </div>
        <p class="type-body-xs fg-ghost">Empty means unbound. Claude Code, Codex or you can also edit the canvas file directly.</p>
      </PanelSection>

      <PanelSection title="Size">
        <template v-if="isDesign">
          <div class="grid grid-cols-2 gap-2">
            <div class="flex flex-col gap-1.5">
              <Label>Width</Label>
              <Select :model-value="frame.width === 'hug' ? 'hug' : 'fixed'" :options="sizeModes" @update:model-value="setSize('width', $event as string)" />
            </div>
            <div class="flex flex-col gap-1.5">
              <Label>Height</Label>
              <Select :model-value="frame.height === 'hug' ? 'hug' : 'fixed'" :options="sizeModes" @update:model-value="setSize('height', $event as string)" />
            </div>
            <Input v-if="frame.width !== 'hug'" type="number" min="40" :model-value="frame.width" aria-label="Width in pixels" @change="patchFrame(id(), { width: num($event) })" />
            <span v-else />
            <Input v-if="frame.height !== 'hug'" type="number" min="40" :model-value="frame.height" aria-label="Height in pixels" @change="patchFrame(id(), { height: num($event) })" />
          </div>
        </template>
        <template v-else>
          <div class="flex flex-wrap gap-1.5">
            <Button v-for="p in presets" :key="p.label" variant="outline" size="xs" @click="patchFrame(id(), { width: p.width, height: p.height })">{{ p.label }}</Button>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div class="flex flex-col gap-1.5"><Label for="p-w">Width</Label><Input id="p-w" type="number" min="40" :model-value="frame.width" @change="patchFrame(id(), { width: num($event) })" /></div>
            <div class="flex flex-col gap-1.5"><Label for="p-h">Height</Label><Input id="p-h" type="number" min="40" :model-value="frame.height" @change="patchFrame(id(), { height: num($event) })" /></div>
          </div>
        </template>
      </PanelSection>

      <PanelSection v-if="isDesign" title="Scenario">
        <Input :model-value="frame.scenario ?? ''" placeholder="e.g. tr" aria-label="Scenario" @change="patchFrame(id(), { scenario: text($event) || undefined })" />
        <p class="type-body-xs fg-ghost">A name your <code class="type-code-xs">.visual-canvas/preview.ts</code> can read from <code class="type-code-xs">setup(app, context)</code>, for example to pick a locale or seed a store. Changing it reloads the frame.</p>
      </PanelSection>

      <PanelSection v-if="isDesign" title="Props">
        <Textarea v-model="propsText" rows="4" spellcheck="false" placeholder='{ "isDark": true }' class="font-mono text-xs" :aria-invalid="propsError ? 'true' : undefined" @change="setProps" />
        <p v-if="propsError" class="type-body-xs fg-error">{{ propsError }}</p>
        <p v-else class="type-body-xs fg-ghost">JSON passed to the component as props. Several frames can show one component in different states.</p>
      </PanelSection>

      <PanelSection v-if="isDesign" title="Frame presentation">
        <div class="flex flex-col gap-1.5">
          <Label for="p-bg">Background</Label>
          <div class="flex gap-2">
            <input
              type="color"
              class="bg-field-bg border-field-border h-8 w-10 shrink-0 cursor-pointer rounded-lg border p-0.5"
              :value="frame.presentation?.background ?? '#ffffff'"
              aria-label="Background colour"
              @input="setPres({ background: ($event.target as HTMLInputElement).value })"
            />
            <Input id="p-bg" :model-value="frame.presentation?.background ?? ''" placeholder="transparent" @change="setPres({ background: text($event) })" />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-2">
          <div class="flex flex-col gap-1.5">
            <Label>Padding</Label>
            <Select :model-value="String(padding)" :options="paddingOptions" @update:model-value="setPres({ padding: Number($event) })" />
          </div>
          <div class="flex flex-col gap-1.5">
            <Label>Overflow</Label>
            <Select :model-value="frame.presentation?.overflow ?? 'visible'" :options="overflowOptions" @update:model-value="setPres({ overflow: $event === 'visible' ? undefined : ($event as Presentation['overflow']) })" />
          </div>
        </div>
        <div class="flex flex-col gap-1.5">
          <Label>Alignment <span class="fg-ghost font-normal">(fixed frames)</span></Label>
          <Select :model-value="frame.presentation?.alignment ?? 'default'" :options="alignmentOptions" @update:model-value="setPres({ alignment: $event === 'default' ? undefined : ($event as Presentation['alignment']) })" />
        </div>
        <div class="flex flex-col gap-1.5">
          <Label for="p-html">Class on &lt;html&gt;</Label>
          <Input id="p-html" :model-value="frame.presentation?.htmlAttributes?.class ?? ''" placeholder="dark" @change="setHtmlClass" />
        </div>
        <p class="type-body-xs fg-ghost">Frame settings only. They never change the component's own CSS. The class lets one frame show a dark theme (Tailwind <code class="type-code-xs">dark</code>); other attributes, like <code class="type-code-xs">data-theme</code>, can be set in the canvas file.</p>
      </PanelSection>

      <PanelSection>
        <div class="flex flex-wrap gap-2">
          <Button v-if="frame.source" variant="outline" size="sm" title="Open the component file in your editor" @click="openFrameSource(id())"><ExternalLink /> Open source</Button>
          <Button variant="outline" size="sm" @click="copyFrame(id())"><Copy /> Duplicate</Button>
          <Button variant="outline" size="sm" title="Zoom to this frame" @click="fitFrames(id())"><Focus /> Zoom to</Button>
          <Button variant="destructive" size="sm" @click="removeFrame(id())"><Trash2 /> Delete</Button>
        </div>
      </PanelSection>
    </template>

    <template v-else-if="state.current">
      <header class="flex flex-col gap-1.5 border-b p-3">
        <strong class="type-heading-4">Canvas</strong>
        <span class="type-code-xs fg-ghost truncate">{{ state.current }}</span>
      </header>
      <PanelSection>
        <div class="flex items-center gap-2">
          <Badge variant="neutral">{{ state.canvas?.frames.length ?? 0 }} frame{{ state.canvas?.frames.length === 1 ? '' : 's' }}</Badge>
        </div>
        <p class="type-body-s fg-ghost">Click a frame's title to select it. Drag the title to move it, and drag its edges to resize.</p>
        <Button variant="outline" size="sm" class="self-start" @click="resetView">Reset view</Button>
      </PanelSection>
      <PanelSection title="Shortcuts (as in Figma)">
        <dl class="flex flex-col gap-1.5">
          <div v-for="[label, keys] in shortcuts" :key="label" class="flex items-center justify-between gap-3">
            <dt class="type-body-xs fg-ghost">{{ label }}</dt>
            <dd class="flex flex-wrap justify-end gap-1"><Kbd v-for="k in keys" :key="k">{{ k }}</Kbd></dd>
          </div>
        </dl>
        <p class="type-body-xs fg-ghost">Ctrl instead of ⌘ on Windows and Linux.</p>
      </PanelSection>
      <PanelSection>
        <Button
          variant="destructive"
          size="sm"
          class="self-start"
          title="Deletes this canvas's layout file only. Application source files are never touched."
          @click="removeCanvas"
        ><Trash2 /> Delete canvas</Button>
      </PanelSection>
    </template>
  </aside>
</template>
