<script setup lang="ts">
import { cn } from '@/lib/cn'
import { badgeVariants, type BadgeVariants } from './badge-variants'

defineOptions({ inheritAttrs: false })
defineProps<{ variant?: BadgeVariants['variant'] }>()
</script>

<template>
  <span v-bind="{ ...$attrs, class: undefined }" data-slot="badge" :data-variant="variant ?? 'default'" :class="cn(badgeVariants({ variant }), $attrs.class as string)">
    <slot />
  </span>
</template>
