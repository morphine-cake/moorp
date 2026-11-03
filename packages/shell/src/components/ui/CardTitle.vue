<script setup lang="ts">
import { cn } from '@/lib/cn'
defineOptions({ inheritAttrs: false })
</script>

<template>
  <div v-bind="{ ...$attrs, class: undefined }" data-slot="card-title" :class="cn('leading-none font-semibold', $attrs.class as string)">
    <slot />
  </div>
</template>
