<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { TooltipProvider } from 'reka-ui'
import { X } from 'lucide-vue-next'
import Button from '@/components/ui/Button.vue'
import UiKit from './UiKit.vue'
import CanvasView from './components/CanvasView.vue'
import PropertiesPanel from './components/PropertiesPanel.vue'
import Sidebar from './components/Sidebar.vue'
import { matchShortcut } from './shortcuts.ts'
import { dismissError, init, runAction, state } from './store'

const typing = (t: EventTarget | null) => !!(t as HTMLElement | null)?.closest?.('input, textarea, select, [contenteditable="true"]')

function onKeyDown(e: KeyboardEvent) {
  if (typing(e.target)) return
  const target = e.target as HTMLElement | null
  // Space held = hand tool, unless it is activating a button or link.
  if (e.code === 'Space') {
    if (!target?.closest?.('button, a, summary')) {
      state.spaceDown = true
      e.preventDefault()
    }
    return
  }
  const action = matchShortcut(e)
  if (!action) return
  // Tab keeps moving between controls unless nothing has focus (Figma: Tab selects the next layer).
  if ((action.type === 'next' || action.type === 'previous') && target !== document.body) return
  e.preventDefault()
  runAction(action)
}
const onKeyUp = (e: KeyboardEvent) => e.code === 'Space' && (state.spaceDown = false)
const onBlur = () => (state.spaceDown = false)

// #/__ui shows the design-system page instead of the app.
const showKit = ref(location.hash === '#/__ui')
let started = false
function start() {
  if (started || showKit.value) return
  started = true
  void init()
}
const onHash = () => {
  showKit.value = location.hash === '#/__ui'
  start()
}

onMounted(() => {
  start()
  window.addEventListener('hashchange', onHash)
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  window.addEventListener('blur', onBlur)
})
onUnmounted(() => {
  window.removeEventListener('hashchange', onHash)
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('keyup', onKeyUp)
  window.removeEventListener('blur', onBlur)
})
</script>

<template>
  <TooltipProvider :delay-duration="400" :skip-delay-duration="200">
    <UiKit v-if="showKit" />
    <div v-else class="app bg-base fg-base grid h-full grid-cols-[260px_minmax(0,1fr)_300px]" :class="{ zen: state.hideUI }">
      <Sidebar />
      <main class="stage relative min-w-0 overflow-hidden">
        <CanvasView v-if="state.current" />
        <div v-else class="grid h-full place-content-center gap-1 p-6 text-center">
          <h2 class="type-heading-2">No canvas open</h2>
          <p class="type-body-m fg-ghost">Create a canvas from the sidebar to start arranging live frames.</p>
        </div>
        <div v-if="state.error" class="bg-error-soft fg-error-strong shadow-elevation-menu type-body-s absolute top-3 left-1/2 z-20 flex max-w-[80%] -translate-x-1/2 items-center gap-2 rounded-xl py-1.5 pr-1.5 pl-3" role="alert">
          <span>{{ state.error }}</span>
          <Button variant="ghost" size="icon-xs" aria-label="Dismiss" @click="dismissError"><X /></Button>
        </div>
      </main>
      <PropertiesPanel />
    </div>
  </TooltipProvider>
</template>
