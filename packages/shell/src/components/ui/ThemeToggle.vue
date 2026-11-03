<script setup lang="ts">
import { computed } from 'vue'
import { Monitor, Moon, Sun } from 'lucide-vue-next'
import { cycleTheme, theme } from '@/theme'
import Button from './Button.vue'
import Tooltip from './Tooltip.vue'

const label = computed(() => ({ system: 'Theme: system', light: 'Theme: light', dark: 'Theme: dark' })[theme.mode])
</script>

<template>
  <Tooltip :text="label">
    <Button variant="ghost" size="icon-sm" :aria-label="label" @click="cycleTheme">
      <Monitor v-if="theme.mode === 'system'" />
      <Sun v-else-if="theme.mode === 'light'" />
      <Moon v-else />
    </Button>
  </Tooltip>
</template>
