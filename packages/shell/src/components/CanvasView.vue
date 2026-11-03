<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { addFrame, fitFrames, state } from '../store'
import FrameBox from './FrameBox.vue'

const MIN_ZOOM = 0.02
const host = ref<HTMLElement | null>(null)
const frames = computed(() => state.canvas?.frames ?? [])

/** Pixel-equivalent wheel delta, clamped so one mouse-wheel notch is a modest step (~1.35x) and pinch stays smooth. */
function wheelDelta(deltaY: number, deltaMode = 0) {
  const px = deltaY * (deltaMode === 1 ? 16 : deltaMode === 2 ? 100 : 1)
  return Math.max(-30, Math.min(30, px))
}

function zoomAt(cx: number, cy: number, deltaY: number, deltaMode = 0) {
  const v = state.view
  const next = Math.min(4, Math.max(MIN_ZOOM, v.s * Math.exp(-wheelDelta(deltaY, deltaMode) * 0.01)))
  v.tx = cx - ((cx - v.tx) * next) / v.s
  v.ty = cy - ((cy - v.ty) * next) / v.s
  v.s = next
}

/** Screen coordinates relative to the canvas area. */
function local(clientX: number, clientY: number) {
  const r = host.value!.getBoundingClientRect()
  return { x: clientX - r.left, y: clientY - r.top }
}

// Wheel on the canvas itself (iframes keep their own scroll): ctrl/pinch zooms, otherwise pans.
function onWheel(e: WheelEvent) {
  e.preventDefault()
  if (e.ctrlKey || e.metaKey) {
    const p = local(e.clientX, e.clientY)
    zoomAt(p.x, p.y, e.deltaY, e.deltaMode)
  } else {
    state.view.tx -= e.deltaX
    state.view.ty -= e.deltaY
  }
}

// Drag on empty canvas pans; a click on it clears the selection.
function onPointerDown(e: PointerEvent) {
  if (e.target !== host.value && !(e.target as HTMLElement).classList.contains('world')) return
  state.selected = null
  const el = host.value!
  el.setPointerCapture(e.pointerId)
  let lx = e.clientX
  let ly = e.clientY
  const move = (m: PointerEvent) => {
    state.view.tx += m.clientX - lx
    state.view.ty += m.clientY - ly
    lx = m.clientX
    ly = m.clientY
  }
  const up = () => {
    el.removeEventListener('pointermove', move)
    el.removeEventListener('pointerup', up)
  }
  el.addEventListener('pointermove', move)
  el.addEventListener('pointerup', up)
}

/** Pinch / ctrl+wheel forwarded from inside an iframe, already converted to canvas-area coordinates by the frame. */
function onFrameZoom(clientX: number, clientY: number, deltaY: number) {
  const p = local(clientX, clientY)
  zoomAt(p.x, p.y, deltaY)
}

let observer: ResizeObserver | undefined
onMounted(() => {
  observer = new ResizeObserver(([entry]) => {
    if (entry) state.viewport = { w: entry.contentRect.width, h: entry.contentRect.height }
  })
  observer.observe(host.value!)
})
onUnmounted(() => observer?.disconnect())
</script>

<template>
  <div ref="host" class="host" :class="{ dragging: state.dragging }" @wheel="onWheel" @pointerdown="onPointerDown">
    <div
      class="world"
      :style="{ transform: `translate(${state.view.tx}px, ${state.view.ty}px) scale(${state.view.s})`, '--s': state.view.s }"
    >
      <FrameBox v-for="f in frames" :key="f.id" :frame="f" @zoom="onFrameZoom" />
    </div>

    <div class="canvas-tools">
      <button @click="addFrame('design')">+ Design frame</button>
      <button @click="addFrame('page')">+ Page frame</button>
      <button title="Zoom to fit all frames" @click="fitFrames()">Fit</button>
      <span class="zoom">{{ Math.round(state.view.s * 100) }}%</span>
    </div>

    <div v-if="state.canvas && !frames.length" class="empty-hint">
      <h2>Empty canvas</h2>
      <p>Add a Design frame for a component, or a Page frame for a running route. Then bind a source in the properties panel.</p>
    </div>
  </div>
</template>
