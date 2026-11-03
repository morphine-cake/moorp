<script setup lang="ts">
import { onMounted } from 'vue'
import CanvasView from './components/CanvasView.vue'
import PropertiesPanel from './components/PropertiesPanel.vue'
import Sidebar from './components/Sidebar.vue'
import { dismissError, init, state } from './store'

onMounted(init)
</script>

<template>
  <div class="app">
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
