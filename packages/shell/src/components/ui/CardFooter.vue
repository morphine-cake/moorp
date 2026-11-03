<script setup lang="ts">
import { cn } from '@/lib/cn'
defineOptions({ inheritAttrs: false })
</script>

<template>
  <div v-bind="{ ...$attrs, class: undefined }" data-slot="card-footer" :class="cn('flex items-center px-6 [.border-t]:pt-6', $attrs.class as string)">
    <slot />
  </div>
</template>
