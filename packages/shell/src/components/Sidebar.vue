<script setup lang="ts">
import { computed, nextTick, reactive, ref } from 'vue'
import { ChevronDown, ChevronRight, Frame, LayoutGrid, Plus } from 'lucide-vue-next'
import { createCanvas, openCanvas, renameCanvas, state } from '../store'
import Button from '@/components/ui/Button.vue'
import Input from '@/components/ui/Input.vue'
import ThemeToggle from '@/components/ui/ThemeToggle.vue'
import Tooltip from '@/components/ui/Tooltip.vue'

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
type InputRef = { $el: HTMLInputElement }
const input = ref<InputRef[] | InputRef | null>(null)
function focusInput() {
  const el = (Array.isArray(input.value) ? input.value[0] : input.value)?.$el
  el?.focus()
  el?.select()
}

async function startNew(folder = '') {
  if (folder) closed.delete(folder)
  editing.value = { kind: 'new', folder }
  draft.value = 'Untitled Canvas'
  await nextTick()
  focusInput()
}

async function startRename(path: string) {
  editing.value = { kind: 'rename', path }
  draft.value = path.split('/').pop()!
  await nextTick()
  focusInput()
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
  <aside class="sidebar bg-base flex min-w-0 flex-col overflow-hidden border-r">
    <header class="flex items-center justify-between gap-2 border-b p-3">
      <div class="flex min-w-0 items-center gap-2">
        <span class="bg-brand fg-brand-on grid size-6 shrink-0 place-items-center rounded-md"><Frame class="size-3.5" /></span>
        <span class="type-heading-4 truncate" :title="state.info?.root">{{ state.info?.root ?? 'Moorp' }}</span>
      </div>
      <Tooltip text="New canvas">
        <Button size="icon-sm" aria-label="New canvas" @click="startNew()"><Plus /></Button>
      </Tooltip>
    </header>

    <ul class="flex-1 space-y-0.5 overflow-auto p-2" role="tree">
      <li v-if="editing?.kind === 'new' && !editing.folder" class="px-1">
        <Input ref="input" v-model="draft" class="h-7" @keydown.enter="finish(true)" @keydown.esc="finish(false)" @blur="finish(true, true)" />
      </li>
      <template v-for="row in rows" :key="(row.canvas ? 'c:' : 'f:') + row.path">
        <!-- Rows use the codeva nav-item tokens: quiet by default, a raised white chip with brand text when selected. -->
        <li
          class="group flex h-8 cursor-pointer items-center gap-1.5 rounded-lg pr-1 transition-colors select-none"
          :class="
            row.canvas && row.path === state.current
              ? 'bg-[var(--nav-item-bg-selected)] text-[var(--nav-item-fg-selected)] shadow-[var(--effect-nav-item)]'
              : 'text-[var(--nav-item-fg-default)] hover:bg-[var(--nav-item-bg-hover)] hover:text-[var(--nav-item-fg-hover)]'
          "
          :style="{ paddingLeft: 6 + row.depth * 14 + 'px' }"
          role="treeitem"
          :aria-selected="row.canvas && row.path === state.current"
          @click="row.canvas ? openCanvas(row.path) : toggle(row.path)"
          @dblclick.stop="row.canvas && startRename(row.path)"
        >
          <template v-if="editing?.kind === 'rename' && editing.path === row.path">
            <Input ref="input" v-model="draft" class="h-7" @click.stop @keydown.enter="finish(true)" @keydown.esc="finish(false)" @blur="finish(true, true)" />
          </template>
          <template v-else>
            <template v-if="row.canvas">
              <LayoutGrid class="size-4 shrink-0" />
              <span class="type-body-m truncate" :class="row.path === state.current && 'font-medium'">{{ row.name }}</span>
            </template>
            <template v-else>
              <component :is="closed.has(row.path) ? ChevronRight : ChevronDown" class="fg-ghost size-4 shrink-0" />
              <span class="type-body-m-semibold truncate">{{ row.name }}</span>
              <Tooltip text="New canvas in this folder">
                <Button
                  variant="ghost"
                  size="icon-xs"
                  class="ml-auto opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                  aria-label="New canvas in this folder"
                  @click.stop="startNew(row.path)"
                ><Plus /></Button>
              </Tooltip>
            </template>
          </template>
        </li>
        <li v-if="editing?.kind === 'new' && editing.folder === row.path && !row.canvas" :style="{ paddingLeft: 6 + (row.depth + 1) * 14 + 'px' }" class="pr-1">
          <Input ref="input" v-model="draft" class="h-7" @keydown.enter="finish(true)" @keydown.esc="finish(false)" @blur="finish(true, true)" />
        </li>
      </template>
      <li v-if="!rows.length && !editing" class="type-body-s fg-ghost px-2 py-1">No canvases yet.</li>
    </ul>

    <footer class="flex items-center justify-between gap-2 border-t p-2 pl-3">
      <span class="type-body-xs fg-ghost">Double-click a canvas to rename it.</span>
      <ThemeToggle />
    </footer>
  </aside>
</template>
