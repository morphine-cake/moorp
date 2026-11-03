<script setup lang="ts">
import { cn } from '@/lib/cn'
defineOptions({ inheritAttrs: false })
</script>

<template>
  <label
    v-bind="{ ...$attrs, class: undefined }"
    data-slot="label"
    :class="cn('flex items-center gap-2 text-sm leading-none font-medium select-none peer-disabled:cursor-not-allowed peer-disabled:opacity-50', $attrs.class as string)"
  >
    <slot />
  </label>
</template>
