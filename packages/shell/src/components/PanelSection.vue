<script setup lang="ts">
defineProps<{ title?: string }>()
</script>

<template>
  <section class="flex flex-col gap-3 border-b p-3 last:border-b-0">
    <h4 v-if="title" class="type-heading-6 fg-ghost tracking-wider uppercase">{{ title }}</h4>
    <slot />
  </section>
</template>
