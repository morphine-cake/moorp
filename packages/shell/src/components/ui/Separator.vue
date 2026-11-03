<script setup lang="ts">
import { cn } from '@/lib/cn'

defineOptions({ inheritAttrs: false })
withDefaults(defineProps<{ orientation?: 'horizontal' | 'vertical' }>(), { orientation: 'horizontal' })
</script>

<template>
  <div
    v-bind="{ ...$attrs, class: undefined }"
    role="separator"
    data-slot="separator"
    :data-orientation="orientation"
    :aria-orientation="orientation"
    :class="cn('bg-border shrink-0 data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px', $attrs.class as string)"
  />
</template>
