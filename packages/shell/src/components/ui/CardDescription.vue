<script setup lang="ts">
import { cn } from '@/lib/cn'
defineOptions({ inheritAttrs: false })
</script>

<template>
  <div v-bind="{ ...$attrs, class: undefined }" data-slot="card-description" :class="cn('fg-ghost text-sm', $attrs.class as string)">
    <slot />
  </div>
</template>
