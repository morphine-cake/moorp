<script setup lang="ts">
import { SelectIcon, SelectTrigger, type SelectTriggerProps } from 'reka-ui'
import { ChevronDown } from 'lucide-vue-next'
import { cn } from '@/lib/cn'

defineOptions({ inheritAttrs: false })
const props = withDefaults(defineProps<SelectTriggerProps & { size?: 'sm' | 'default' }>(), { size: 'default' })
</script>

<template>
  <!-- Class strings are copied from codeva's components/ui/select.tsx (SelectTrigger). -->
  <SelectTrigger
    v-bind="{ ...$attrs, ...props, class: undefined }"
    data-slot="select-trigger"
    :data-size="size"
    :class="
      cn(
        'type-body-m flex w-fit items-center justify-between gap-2 rounded-lg border px-2 py-1.5 whitespace-nowrap outline-none transition-[color,box-shadow,border-color,background-color]',
        'bg-field-bg text-field-fg border-field-border data-[placeholder]:text-field-fg-placeholder [&_svg:not([class*=\'text-\']):not([class*=\'fg-\'])]:text-field-fg-placeholder',
        'hover:bg-field-bg-hover',
        'focus-visible:bg-field-bg-focus focus-visible:border-field-border-focus focus-visible:shadow-[var(--effect-field-focus)]',
        'data-[state=open]:bg-field-bg-focus data-[state=open]:border-field-border-focus data-[state=open]:shadow-[var(--effect-field-focus)]',
        'aria-invalid:bg-field-bg-error aria-invalid:border-field-border-error aria-invalid:shadow-[var(--effect-field-error)]',
        'disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-field-bg-disable disabled:border-field-border-disable disabled:text-field-fg-disable',
        'data-[size=default]:h-8 data-[size=sm]:h-7',
        '*:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2',
        '[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=\'size-\'])]:size-4',
        $attrs.class as string,
      )
    "
  >
    <slot />
    <SelectIcon as-child>
      <ChevronDown class="size-4" />
    </SelectIcon>
  </SelectTrigger>
</template>
