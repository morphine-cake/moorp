<script setup lang="ts">
import { computed } from 'vue'
import type { Presentation } from '@moorp/core'
import { copyFrame, deleteCanvas, patchFrame, removeFrame, resetView, selectedFrame as frame, state } from '../store'

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

const padding = computed(() => frame.value?.presentation?.padding ?? 0)
</script>

<template>
  <aside class="panel">
    <template v-if="frame">
      <header>
        <strong>{{ frame.name }}</strong>
        <span class="muted">{{ frame.id }} · {{ frame.type }}</span>
      </header>

      <section>
        <label>Name <input :value="frame.name" @change="patchFrame(id(), { name: ($event.target as HTMLInputElement).value.trim() || frame.name })" /></label>
      </section>

      <section>
        <h4>Source</h4>
        <label v-if="isDesign">
          Component file
          <input :value="frame.source?.file ?? ''" placeholder="src/components/Card.vue" @change="setSource" />
        </label>
        <label v-else>
          URL or route
          <input :value="frame.url ?? ''" placeholder="/" @change="setUrl" />
        </label>
        <p class="hint">Empty means unbound. Claude Code, Codex or you can also edit the canvas file directly.</p>
      </section>

      <section>
        <h4>Size</h4>
        <template v-if="isDesign">
          <div class="pair">
            <label>Width
              <select :value="frame.width === 'hug' ? 'hug' : 'fixed'" @change="setSize('width', ($event.target as HTMLSelectElement).value)">
                <option value="hug">Hug</option><option value="fixed">Fixed</option>
              </select>
            </label>
            <input v-if="frame.width !== 'hug'" type="number" min="40" :value="frame.width" @change="patchFrame(id(), { width: num($event) })" />
          </div>
          <div class="pair">
            <label>Height
              <select :value="frame.height === 'hug' ? 'hug' : 'fixed'" @change="setSize('height', ($event.target as HTMLSelectElement).value)">
                <option value="hug">Hug</option><option value="fixed">Fixed</option>
              </select>
            </label>
            <input v-if="frame.height !== 'hug'" type="number" min="40" :value="frame.height" @change="patchFrame(id(), { height: num($event) })" />
          </div>
        </template>
        <template v-else>
          <div class="presets">
            <button v-for="p in presets" :key="p.label" @click="patchFrame(id(), { width: p.width, height: p.height })">{{ p.label }}</button>
          </div>
          <div class="pair">
            <label>Width <input type="number" min="40" :value="frame.width" @change="patchFrame(id(), { width: num($event) })" /></label>
            <label>Height <input type="number" min="40" :value="frame.height" @change="patchFrame(id(), { height: num($event) })" /></label>
          </div>
        </template>
      </section>

      <section v-if="isDesign">
        <h4>Frame presentation</h4>
        <label>Background
          <span class="pair">
            <input type="color" :value="frame.presentation?.background ?? '#ffffff'" @input="setPres({ background: ($event.target as HTMLInputElement).value })" />
            <input :value="frame.presentation?.background ?? ''" placeholder="transparent" @change="setPres({ background: ($event.target as HTMLInputElement).value.trim() })" />
          </span>
        </label>
        <label>Padding
          <select :value="padding" @change="setPres({ padding: Number(($event.target as HTMLSelectElement).value) })">
            <option v-for="p in [0, 8, 16, 24, 32]" :key="p" :value="p">{{ p }}</option>
            <option v-if="![0, 8, 16, 24, 32].includes(padding)" :value="padding">{{ padding }}</option>
          </select>
        </label>
        <label>Alignment <span class="hint">(fixed frames)</span>
          <select :value="frame.presentation?.alignment ?? ''" @change="setPres({ alignment: (($event.target as HTMLSelectElement).value || undefined) as Presentation['alignment'] })">
            <option value="">Default</option><option value="start">Start</option><option value="center">Center</option><option value="end">End</option>
          </select>
        </label>
        <label>Overflow
          <select :value="frame.presentation?.overflow ?? ''" @change="setPres({ overflow: (($event.target as HTMLSelectElement).value || undefined) as Presentation['overflow'] })">
            <option value="">Visible</option><option value="hidden">Hidden</option><option value="scroll">Scroll</option>
          </select>
        </label>
        <p class="hint">These are frame settings only. They never change the component's own CSS.</p>
      </section>

      <section class="row-actions">
        <button @click="copyFrame(id())">Duplicate</button>
        <button class="danger" @click="removeFrame(id())">Delete frame</button>
      </section>
    </template>

    <template v-else-if="state.current">
      <header>
        <strong>Canvas</strong>
        <span class="muted">{{ state.current }}</span>
      </header>
      <section>
        <p>{{ state.canvas?.frames.length ?? 0 }} frame(s)</p>
        <p class="hint">Click a frame's title bar to select it. Drag the title bar to move it, and drag its edges to resize.</p>
        <button @click="resetView">Reset view</button>
      </section>
      <section class="row-actions">
        <button
          class="danger"
          title="Deletes this canvas's layout file only. Application source files are never touched."
          @click="removeCanvas"
        >
          Delete canvas
        </button>
      </section>
    </template>
  </aside>
</template>
