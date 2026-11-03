<script setup lang="ts">
defineProps<{ label?: string }>()
</script>

<template>
  <span class="badge">{{ label ?? 'New' }}</span>
</template>

<style scoped>
.badge { display: inline-block; padding: 2px 10px; border-radius: 999px; background: #dcfce7; color: #166534; font-size: 13px; }
</style>
