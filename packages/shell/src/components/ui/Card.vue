<script setup lang="ts">
import { cn } from '@/lib/cn'
defineOptions({ inheritAttrs: false })
</script>

<template>
  <div v-bind="{ ...$attrs, class: undefined }" data-slot="card" :class="cn('bg-card fg-base flex flex-col gap-6 rounded-2xl py-6 shadow-elevation-card', $attrs.class as string)">
    <slot />
  </div>
</template>
