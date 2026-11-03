<script setup lang="ts">
import { cn } from '@/lib/cn'
defineOptions({ inheritAttrs: false })
</script>

<template>
  <div v-bind="{ ...$attrs, class: undefined }" data-slot="card-content" :class="cn('px-6', $attrs.class as string)">
    <slot />
  </div>
</template>
