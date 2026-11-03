import { startPreview } from '@moorp/vue'
import { setup } from '../.visual-canvas/preview'

const modules = import.meta.glob('/src/**/*.vue')

startPreview({
  root: document.getElementById('root')!,
  setup,
  async load(file, exportName = 'default') {
    const loader = modules['/' + file]
    if (!loader) throw new Error(`No component found for ${file}`)
    const mod = (await loader()) as Record<string, unknown>
    const component = mod[exportName]
    if (!component) throw new Error(`${file} has no export "${exportName}"`)
    return component as never
  },
})
