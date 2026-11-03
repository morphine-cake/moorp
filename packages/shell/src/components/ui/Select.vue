<script setup lang="ts">
import { SelectRoot, SelectValue } from 'reka-ui'
import SelectContent from './SelectContent.vue'
import SelectItem from './SelectItem.vue'
import SelectTrigger from './SelectTrigger.vue'

export type SelectOption = { value: string; label: string; disabled?: boolean }

// One select for the common case: a list of options and a v-model. Option values must not be empty strings.
const model = defineModel<string>()
defineProps<{ options: SelectOption[]; placeholder?: string; size?: 'sm' | 'default'; disabled?: boolean; invalid?: boolean }>()
</script>

<template>
  <SelectRoot v-model="model" :disabled="disabled">
    <SelectTrigger :size="size" class="w-full" :aria-invalid="invalid || undefined">
      <SelectValue :placeholder="placeholder" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem v-for="o in options" :key="o.value" :value="o.value" :disabled="o.disabled">{{ o.label }}</SelectItem>
    </SelectContent>
  </SelectRoot>
</template>
