import { startPreview } from '@moorp/vue'
import { setup } from '../.visual-canvas/preview'

startPreview({
  root: document.getElementById('root')!,
  setup,
  async load(file, exportName = 'default') {
    // Dev-server URL import: no glob, so adding a component file does not invalidate this module.
    const mod = (await import(/* @vite-ignore */ '/' + file)) as Record<string, unknown>
    const component = mod[exportName]
    if (!component) throw new Error(`${file} has no export "${exportName}"`)
    return component as never
  },
})
