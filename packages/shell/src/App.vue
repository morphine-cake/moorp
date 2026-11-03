<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
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

onMounted(() => {
  void init()
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  window.addEventListener('blur', onBlur)
})
onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('keyup', onKeyUp)
  window.removeEventListener('blur', onBlur)
})
</script>

<template>
  <div class="app" :class="{ zen: state.hideUI }">
    <Sidebar />
    <main class="stage">
      <CanvasView v-if="state.current" />
      <div v-else class="empty-state">
        <h2>No canvas open</h2>
        <p>Create a canvas from the sidebar to start arranging live frames.</p>
      </div>
      <div v-if="state.error" class="banner" role="alert">
        <span>{{ state.error }}</span>
        <button class="link" @click="dismissError">Dismiss</button>
      </div>
    </main>
    <PropertiesPanel />
  </div>
</template>
