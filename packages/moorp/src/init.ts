import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { createEmptyCanvas, nextFrameId } from '@moorp/core'

export type InitResult = {
  framework: 'vue'
  created: string[]
  skipped: string[]
  notes: string[]
}

const PREVIEW_TS = `import type { App } from 'vue'

// Runs for every Design Frame preview. Load global CSS and fonts here, and install the
// plugins and providers your components expect (router, store, i18n, ...).
// import '../src/styles.css'
// import { createPinia } from 'pinia'

export function setup(app: App) {
  // app.use(createPinia())
}
`

/** Creates `.visual-canvas/` (preview setup and a sample canvas) in a Vue + Vite project. Existing files are kept unless `force`. */
export function runInit(root: string, { force = false }: { force?: boolean } = {}): InitResult {
  const pkgFile = path.join(root, 'package.json')
  if (!existsSync(pkgFile)) throw new Error(`No package.json found in ${root}. Run this in your project's root folder.`)
  const pkg = JSON.parse(readFileSync(pkgFile, 'utf8')) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> }
  const deps = { ...pkg.dependencies, ...pkg.devDependencies }

  if (deps.react && !deps.vue) throw new Error('This looks like a React project. The React adapter is not available yet; Moorp currently supports Vue + Vite.')
  if (!deps.vue) throw new Error('No "vue" dependency found in package.json. Moorp currently supports Vue + Vite projects.')

  const result: InitResult = { framework: 'vue', created: [], skipped: [], notes: [] }
  const write = (rel: string, content: string) => {
    const file = path.join(root, rel)
    if (existsSync(file) && !force) return void result.skipped.push(rel)
    mkdirSync(path.dirname(file), { recursive: true })
    writeFileSync(file, content)
    result.created.push(rel)
  }

  write('.visual-canvas/preview.ts', PREVIEW_TS)
  const canvas = createEmptyCanvas()
  canvas.frames.push({ id: nextFrameId(canvas), name: 'Component', type: 'design', source: null, x: 0, y: 0, width: 'hug', height: 'hug' })
  write('.visual-canvas/canvases/Welcome.canvas.json', JSON.stringify(canvas, null, 2) + '\n')

  if (!deps['@moorp/vue']) result.notes.push('Install the Vue adapter: `npm i -D @moorp/vue@alpha` (or pnpm/yarn add -D).')
  if (!deps.vite) result.notes.push('No "vite" dependency found: Moorp runs on your Vite dev server.')
  if (!deps['@vitejs/plugin-vue']) result.notes.push('No "@vitejs/plugin-vue" found: Vue components will not compile in previews.')
  return result
}
