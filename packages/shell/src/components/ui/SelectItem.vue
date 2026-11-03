<script setup lang="ts">
import { SelectItem, SelectItemIndicator, SelectItemText, type SelectItemProps } from 'reka-ui'
import { Check } from 'lucide-vue-next'
import { cn } from '@/lib/cn'

defineOptions({ inheritAttrs: false })
const props = defineProps<SelectItemProps>()
</script>

<template>
  <!-- Copied from codeva's components/ui/select.tsx (SelectItem). -->
  <SelectItem
    v-bind="{ ...$attrs, ...props, class: undefined }"
    data-slot="select-item"
    :class="
      cn(
        'type-body-m relative flex w-full min-h-5 cursor-default items-center gap-2 rounded-lg py-1.5 pl-2 pr-8 outline-none select-none',
        'text-field-fg focus:bg-field-bg-hover data-[state=checked]:bg-field-bg-selected',
        'data-[disabled]:text-field-fg-ghost data-[disabled]:pointer-events-none',
        '[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=\'size-\'])]:size-4 [&_svg]:text-field-fg-subtle data-[state=checked]:[&_svg]:text-field-fg',
        $attrs.class as string,
      )
    "
  >
    <span data-slot="select-item-indicator" class="absolute right-2 flex size-3.5 items-center justify-center">
      <SelectItemIndicator>
        <Check class="size-4" />
      </SelectItemIndicator>
    </span>
    <SelectItemText><slot /></SelectItemText>
  </SelectItem>
</template>
