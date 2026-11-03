<script setup lang="ts">
import { computed, useAttrs } from 'vue'
import { cn } from '@/lib/cn'

defineOptions({ inheritAttrs: false })
const model = defineModel<string | number>()
const attrs = useAttrs()
const rest = computed(() => {
  const { class: _class, ...others } = attrs
  return others
})
</script>

<template>
  <!-- Class strings are copied from codeva's components/ui/input.tsx. -->
  <input
    v-model="model"
    v-bind="rest"
    data-slot="input"
    :class="
      cn(
        'type-body-m h-8 w-full min-w-0 rounded-lg border px-2 py-1.5 outline-none transition-[color,box-shadow,border-color,background-color]',
        'bg-field-bg text-field-fg placeholder:text-field-fg-placeholder border-field-border',
        'hover:bg-field-bg-hover',
        'focus-visible:bg-field-bg-focus focus-visible:border-field-border-focus focus-visible:shadow-[var(--effect-field-focus)]',
        'aria-invalid:bg-field-bg-error aria-invalid:border-field-border-error aria-invalid:shadow-[var(--effect-field-error)]',
        'disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-field-bg-disable disabled:border-field-border-disable disabled:text-field-fg-disable',
        'selection:bg-primary selection:text-primary-foreground',
        attrs.class as string,
      )
    "
  />
</template>
