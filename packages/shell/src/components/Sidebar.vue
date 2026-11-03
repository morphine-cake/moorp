<script setup lang="ts">
import { computed, nextTick, reactive, ref } from 'vue'
import { createCanvas, openCanvas, renameCanvas, state } from '../store'

type Node = { name: string; path: string; canvas: boolean; children: Node[] }

const OPEN_KEY = 'moorp:folders'
const closed = reactive(new Set<string>(JSON.parse(localStorage.getItem(OPEN_KEY) ?? '[]') as string[]))
const toggle = (p: string) => {
  closed.has(p) ? closed.delete(p) : closed.add(p)
  localStorage.setItem(OPEN_KEY, JSON.stringify([...closed]))
}

const tree = computed<Node[]>(() => {
  const root: Node = { name: '', path: '', canvas: false, children: [] }
  for (const full of state.canvases) {
    let node = root
    const parts = full.split('/')
    parts.forEach((part, i) => {
      const path = parts.slice(0, i + 1).join('/')
      const leaf = i === parts.length - 1
      let child = node.children.find((c) => c.name === part && c.canvas === leaf)
      if (!child) node.children.push((child = { name: part, path, canvas: leaf, children: [] }))
      node = child
    })
  }
  const order = (n: Node) => {
    n.children.sort((a, b) => Number(a.canvas) - Number(b.canvas) || a.name.localeCompare(b.name))
    n.children.forEach(order)
  }
  order(root)
  return root.children
})

type Row = Node & { depth: number }
const rows = computed<Row[]>(() => {
  const out: Row[] = []
  const walk = (nodes: Node[], depth: number) => {
    for (const n of nodes) {
      out.push({ ...n, depth })
      if (!n.canvas && !closed.has(n.path)) walk(n.children, depth + 1)
    }
  }
  walk(tree.value, 0)
  return out
})

// Inline "new canvas" / rename editor.
const editing = ref<{ kind: 'new'; folder: string } | { kind: 'rename'; path: string } | null>(null)
const draft = ref('')
const input = ref<HTMLInputElement[] | HTMLInputElement | null>(null)

async function startNew(folder = '') {
  if (folder) closed.delete(folder)
  editing.value = { kind: 'new', folder }
  draft.value = 'Untitled Canvas'
  await nextTick()
  const el = Array.isArray(input.value) ? input.value[0] : input.value
  el?.focus()
  el?.select()
}

async function startRename(path: string) {
  editing.value = { kind: 'rename', path }
  draft.value = path.split('/').pop()!
  await nextTick()
  const el = Array.isArray(input.value) ? input.value[0] : input.value
  el?.focus()
  el?.select()
}

/** Enter confirms. Escape cancels. Clicking away applies a rename, but never creates a canvas by accident. */
async function finish(apply: boolean, fromBlur = false) {
  const e = editing.value
  editing.value = null
  if (fromBlur && e?.kind === 'new') return
  const name = draft.value.trim()
  if (!apply || !e || !name) return
  if (e.kind === 'new') await createCanvas(e.folder ? `${e.folder}/${name}` : name)
  else {
    const folder = e.path.includes('/') ? e.path.slice(0, e.path.lastIndexOf('/') + 1) : ''
    await renameCanvas(e.path, folder + name)
  }
}
</script>

<template>
  <aside class="sidebar">
    <header>
      <strong>{{ state.info?.root ?? 'Moorp' }}</strong>
      <button class="primary small" @click="startNew()">+ New canvas</button>
    </header>

    <ul class="tree" role="tree">
      <li v-if="editing?.kind === 'new' && !editing.folder" class="row" style="padding-left: 12px">
        <input ref="input" v-model="draft" @keydown.enter="finish(true)" @keydown.esc="finish(false)" @blur="finish(true, true)" />
      </li>
      <template v-for="row in rows" :key="(row.canvas ? 'c:' : 'f:') + row.path">
        <li
          class="row"
          :class="{ active: row.canvas && row.path === state.current, folder: !row.canvas }"
          :style="{ paddingLeft: 12 + row.depth * 14 + 'px' }"
          role="treeitem"
          @click="row.canvas ? openCanvas(row.path) : toggle(row.path)"
          @dblclick.stop="row.canvas && startRename(row.path)"
        >
          <template v-if="editing?.kind === 'rename' && editing.path === row.path">
            <input ref="input" v-model="draft" @click.stop @keydown.enter="finish(true)" @keydown.esc="finish(false)" @blur="finish(true, true)" />
          </template>
          <template v-else>
            <span class="chev">{{ row.canvas ? '' : closed.has(row.path) ? '▸' : '▾' }}</span>
            <span class="label">{{ row.name }}</span>
            <button v-if="!row.canvas" class="icon" title="New canvas in this folder" @click.stop="startNew(row.path)">+</button>
          </template>
        </li>
        <li
          v-if="editing?.kind === 'new' && editing.folder === row.path && !row.canvas"
          class="row"
          :style="{ paddingLeft: 12 + (row.depth + 1) * 14 + 'px' }"
        >
          <input ref="input" v-model="draft" @keydown.enter="finish(true)" @keydown.esc="finish(false)" @blur="finish(true, true)" />
        </li>
      </template>
      <li v-if="!rows.length && !editing" class="hint">No canvases yet.</li>
    </ul>
    <footer class="hint">Double-click a canvas to rename it.</footer>
  </aside>
</template>
