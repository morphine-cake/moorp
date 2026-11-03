<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{ name?: string; role?: string }>(), {
  name: 'Ada Lovelace',
  role: 'Mathematician',
})

const initials = computed(() =>
  props.name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2),
)
</script>

<template>
  <article class="card">
    <div class="avatar">{{ initials }}</div>
    <div>
      <h3>{{ name }}</h3>
      <p>{{ role }}</p>
    </div>
  </article>
</template>

<style scoped>
.card { display: flex; gap: 12px; align-items: center; padding: 12px 16px; border: 1px solid #e4e4e7; border-radius: 12px; background: #fff; }
.avatar { width: 40px; height: 40px; border-radius: 50%; background: var(--accent); color: #fff; display: grid; place-items: center; font-weight: 600; }
h3 { margin: 0; font-size: 15px; }
p { margin: 2px 0 0; color: #71717a; font-size: 13px; }
</style>
