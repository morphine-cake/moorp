<script setup lang="ts">
import { ref } from 'vue'
import { Copy, Maximize, Plus, Redo2, Trash2, Undo2 } from 'lucide-vue-next'
import Badge from '@/components/ui/Badge.vue'
import Button from '@/components/ui/Button.vue'
import Card from '@/components/ui/Card.vue'
import CardContent from '@/components/ui/CardContent.vue'
import CardDescription from '@/components/ui/CardDescription.vue'
import CardFooter from '@/components/ui/CardFooter.vue'
import CardHeader from '@/components/ui/CardHeader.vue'
import CardTitle from '@/components/ui/CardTitle.vue'
import Input from '@/components/ui/Input.vue'
import Kbd from '@/components/ui/Kbd.vue'
import Label from '@/components/ui/Label.vue'
import Select from '@/components/ui/Select.vue'
import Separator from '@/components/ui/Separator.vue'
import Textarea from '@/components/ui/Textarea.vue'
import ThemeToggle from '@/components/ui/ThemeToggle.vue'
import Tooltip from '@/components/ui/Tooltip.vue'

// The design system on one page, for checking the tokens and core components in both themes. Open it at #/__ui.
const variants = ['default', 'secondary', 'outline', 'ghost', 'destructive', 'link'] as const
const sizes = ['xs', 'sm', 'default', 'lg'] as const
const badges = ['default', 'outline', 'contrast', 'success', 'error', 'warning', 'info', 'indigo', 'teal', 'pink', 'lime', 'fuchsia', 'cyan', 'violet', 'rose'] as const
const swatches = [
  ['bg-base', 'bg-base border'],
  ['bg-light', 'bg-light border'],
  ['bg-strong', 'bg-strong'],
  ['bg-stronger', 'bg-stronger'],
  ['bg-card', 'bg-card border'],
  ['bg-menu', 'bg-menu border'],
  ['bg-selected', 'bg-selected'],
  ['btn-primary', 'bg-btn-primary'],
  ['fg-base', 'bg-fg-base'],
  ['fg-subtle', 'bg-fg-subtle'],
  ['fg-ghost', 'bg-fg-ghost'],
  ['fg-placeholder', 'bg-fg-placeholder'],
  ['border-strong', 'bg-border-strong'],
  ['brand', 'bg-brand'],
] as const
const type = [
  ['type-heading-0', 'Heading 0, 32/40'],
  ['type-heading-1', 'Heading 1, 24/32'],
  ['type-heading-2', 'Heading 2, 20/24'],
  ['type-heading-3', 'Heading 3, 16/22'],
  ['type-heading-4', 'Heading 4, 14/20'],
  ['type-heading-5', 'Heading 5, 12/16'],
  ['type-body-m', 'Body M, 14/20'],
  ['type-body-s', 'Body S, 12/16'],
  ['type-body-xs', 'Body XS, 11/16'],
  ['type-code-m', 'Code M, monospace'],
] as const

const text = ref('Hello')
const area = ref('{ "isDark": true }')
const choice = ref('hug')
const sizeOptions = [
  { value: 'hug', label: 'Hug' },
  { value: 'fixed', label: 'Fixed' },
  { value: 'gone', label: 'Not available', disabled: true },
]
</script>

<template>
  <div class="bg-base fg-base h-full overflow-auto">
    <div class="mx-auto flex max-w-4xl flex-col gap-10 p-8">
      <header class="flex items-center justify-between">
        <div>
          <h1 class="type-heading-1">Design system</h1>
          <p class="type-body-m fg-ghost">Tokens and core components, ported from codeva. Follows the system theme; the button cycles system, light and dark.</p>
        </div>
        <ThemeToggle />
      </header>

      <section class="flex flex-col gap-3">
        <h2 class="type-heading-3">Colors</h2>
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div v-for="[name, cls] in swatches" :key="name" class="flex flex-col gap-1.5">
            <div :class="['h-10 rounded-lg', cls]" />
            <span class="type-code-xs fg-ghost">{{ name }}</span>
          </div>
        </div>
      </section>

      <section class="flex flex-col gap-3">
        <h2 class="type-heading-3">Typography</h2>
        <div class="flex flex-col gap-1.5">
          <p v-for="[cls, label] in type" :key="cls" :class="cls">{{ label }}</p>
        </div>
      </section>

      <section class="flex flex-col gap-4">
        <h2 class="type-heading-3">Buttons</h2>
        <div v-for="v in variants" :key="v" class="flex flex-wrap items-center gap-3">
          <span class="type-code-xs fg-ghost w-24">{{ v }}</span>
          <Button v-for="s in sizes" :key="s" :variant="v" :size="s">Button</Button>
          <Button :variant="v" disabled>Disabled</Button>
          <Button :variant="v"><Plus /> With icon</Button>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <span class="type-code-xs fg-ghost w-24">icon sizes</span>
          <Tooltip text="Undo" shortcut="⌘Z"><Button variant="ghost" size="icon-xs"><Undo2 /></Button></Tooltip>
          <Tooltip text="Redo" shortcut="⇧⌘Z"><Button variant="ghost" size="icon-sm"><Redo2 /></Button></Tooltip>
          <Tooltip text="Zoom to fit" shortcut="⇧1"><Button variant="outline" size="icon"><Maximize /></Button></Tooltip>
          <Tooltip text="Duplicate" shortcut="⌘D"><Button variant="secondary" size="icon-lg"><Copy /></Button></Tooltip>
          <Tooltip text="Delete" shortcut="⌫"><Button variant="destructive" size="icon"><Trash2 /></Button></Tooltip>
        </div>
      </section>

      <section class="flex flex-col gap-4">
        <h2 class="type-heading-3">Fields</h2>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div class="flex flex-col gap-1.5"><Label for="a">Input</Label><Input id="a" v-model="text" placeholder="Placeholder" /></div>
          <div class="flex flex-col gap-1.5"><Label for="b">Invalid</Label><Input id="b" model-value="Wrong" aria-invalid="true" /></div>
          <div class="flex flex-col gap-1.5"><Label for="c">Disabled</Label><Input id="c" model-value="Disabled" disabled /></div>
          <div class="flex flex-col gap-1.5"><Label>Select</Label><Select v-model="choice" :options="sizeOptions" placeholder="Choose" /></div>
          <div class="flex flex-col gap-1.5"><Label>Select, small</Label><Select v-model="choice" :options="sizeOptions" size="sm" /></div>
          <div class="flex flex-col gap-1.5"><Label>Select, invalid</Label><Select :options="sizeOptions" placeholder="Choose" invalid /></div>
          <div class="flex flex-col gap-1.5 sm:col-span-2"><Label for="d">Textarea</Label><Textarea id="d" v-model="area" class="font-mono" /></div>
        </div>
      </section>

      <section class="flex flex-col gap-3">
        <h2 class="type-heading-3">Badges and keys</h2>
        <div class="flex flex-wrap gap-2"><Badge v-for="b in badges" :key="b" :variant="b">{{ b }}</Badge></div>
        <div class="flex items-center gap-3">
          <Kbd>⌘</Kbd><Kbd>Z</Kbd><Kbd>⇧</Kbd><Kbd>Space</Kbd>
        </div>
      </section>

      <section class="flex flex-col gap-3">
        <h2 class="type-heading-3">Surfaces</h2>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Card</CardTitle><CardDescription>Elevation is an inset ring, not a border.</CardDescription></CardHeader>
            <CardContent class="type-body-m">Cards, menus and modals share the same elevation tokens in both themes.</CardContent>
            <CardFooter class="gap-2"><Button size="sm">Save</Button><Button size="sm" variant="ghost">Cancel</Button></CardFooter>
          </Card>
          <div class="flex flex-col gap-3">
            <div class="bg-menu shadow-elevation-menu rounded-xl p-3 type-body-m">Menu surface (elevation-menu)</div>
            <div class="bg-card shadow-elevation-modal rounded-2xl p-3 type-body-m">Modal surface (elevation-modal)</div>
            <Separator />
            <div class="flex h-6 items-center gap-3 type-body-s fg-ghost">Left<Separator orientation="vertical" />Right</div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
