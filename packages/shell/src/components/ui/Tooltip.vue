<script setup lang="ts">
import { TooltipArrow, TooltipContent, TooltipPortal, TooltipRoot, TooltipTrigger } from 'reka-ui'
import Kbd from './Kbd.vue'

// The element in the default slot is the trigger. Needs a TooltipProvider above it (App.vue has one).
withDefaults(defineProps<{ text: string; shortcut?: string; side?: 'top' | 'right' | 'bottom' | 'left' }>(), { side: 'bottom' })
</script>

<template>
  <TooltipRoot>
    <TooltipTrigger as-child><slot /></TooltipTrigger>
    <TooltipPortal>
      <!-- Class strings are copied from codeva's components/ui/tooltip.tsx. -->
      <TooltipContent
        data-slot="tooltip-content"
        :side="side"
        :side-offset="6"
        class="bg-foreground text-background animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 flex w-fit origin-(--reka-tooltip-content-transform-origin) items-center gap-2 rounded-md px-3 py-1.5 text-xs text-balance"
      >
        {{ text }}
        <Kbd v-if="shortcut">{{ shortcut }}</Kbd>
        <TooltipArrow class="bg-foreground fill-foreground z-50 size-2.5 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-[2px]" />
      </TooltipContent>
    </TooltipPortal>
  </TooltipRoot>
</template>
