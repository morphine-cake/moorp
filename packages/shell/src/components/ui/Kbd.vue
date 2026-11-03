<script setup lang="ts">
import { cn } from '@/lib/cn'
defineOptions({ inheritAttrs: false })
</script>

<template>
  <!-- Copied from codeva's components/ui/kbd.tsx. -->
  <kbd
    v-bind="{ ...$attrs, class: undefined }"
    data-slot="kbd"
    :class="
      cn(
        'bg-strong fg-ghost pointer-events-none inline-flex h-5 w-fit min-w-5 items-center justify-center gap-1 rounded-sm px-1 font-sans text-xs font-medium select-none',
        '[&_svg:not([class*=\'size-\'])]:size-3',
        // Inside a tooltip (inverted colours) the key is translucent. codeva writes `bg-base/20` here, which is not a valid
        // utility (a custom @utility takes no opacity modifier), so it did nothing; `bg-background/20` is what was meant.
        '[[data-slot=tooltip-content]_&]:bg-background/20 [[data-slot=tooltip-content]_&]:text-background dark:[[data-slot=tooltip-content]_&]:bg-background/10',
        $attrs.class as string,
      )
    "
  >
    <slot />
  </kbd>
</template>
