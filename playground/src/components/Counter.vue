<script setup lang="ts">
import { ref } from 'vue'
const count = ref(0)
</script>

<template>
  <button class="counter" @click="count++">Count: {{ count }}</button>
</template>

<style scoped>
.counter { background: var(--accent); color: white; border: 0; border-radius: 8px; padding: 8px 16px; font-size: 16px; }
</style>
