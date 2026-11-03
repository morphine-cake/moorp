<script setup lang="ts">
import { SelectContent, SelectPortal, SelectViewport, type SelectContentProps } from 'reka-ui'
import { cn } from '@/lib/cn'

defineOptions({ inheritAttrs: false })
const props = withDefaults(defineProps<SelectContentProps>(), { position: 'popper', sideOffset: 4 })
</script>

<template>
  <SelectPortal>
    <SelectContent
      v-bind="{ ...$attrs, ...props, class: undefined }"
      data-slot="select-content"
      :class="
        cn(
          'bg-menu fg-base shadow-elevation-menu rounded-xl',
          'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
          'relative z-50 max-h-(--reka-select-content-available-height) min-w-[8rem] origin-(--reka-select-content-transform-origin) overflow-x-hidden overflow-y-auto',
          $attrs.class as string,
        )
      "
    >
      <SelectViewport class="flex flex-col gap-0.5 p-1 w-full min-w-[var(--reka-select-trigger-width)]">
        <slot />
      </SelectViewport>
    </SelectContent>
  </SelectPortal>
</template>
