import { createApp, type App, type Component } from 'vue'
import { PROTOCOL, isProtocolMessage, type PreviewToShell } from '@moorp/core'

export type ComponentLoader = (file: string, exportName?: string) => Promise<Component>

export type PreviewOptions = {
  /** Resolves a manifest source ref to a component. Supplied by the dev-server integration (e.g. Vite glob import). */
  load: ComponentLoader
  /** Called with the app before mount: install router, pinia, i18n etc. (the `preview.ts` context). */
  setup?: (app: App) => void
  root: HTMLElement
}

/** Boots a preview iframe: waits for `init`, mounts the component, reports size and errors to the shell. */
export function startPreview({ load, setup, root }: PreviewOptions): () => void {
  let app: App | null = null
  let frameId = ''
  const post = (msg: Omit<PreviewToShell, 'protocol' | 'frameId'> & { type: PreviewToShell['type'] }) =>
    window.parent.postMessage({ protocol: PROTOCOL, frameId, ...msg }, '*')

  const observer = new ResizeObserver(([entry]) => {
    if (entry) post({ type: 'size', width: entry.contentRect.width, height: entry.contentRect.height } as never)
  })

  async function mount(file: string, exportName?: string) {
    app?.unmount()
    try {
      const component = await load(file, exportName)
      app = createApp(component)
      app.config.errorHandler = (err) => post({ type: 'error', message: String(err) } as never)
      setup?.(app)
      app.mount(root)
      observer.observe(root)
      post({ type: 'ready' } as never)
    } catch (err) {
      post({ type: 'error', message: err instanceof Error ? err.message : String(err) } as never)
    }
  }

  const onMessage = (event: MessageEvent) => {
    if (!isProtocolMessage(event.data)) return
    const msg = event.data
    if (msg.type === 'init') {
      frameId = msg.frameId
      void mount(msg.source.file, msg.source.export)
    } else if (msg.type === 'dispose') {
      app?.unmount()
      app = null
    }
  }
  window.addEventListener('message', onMessage)
  return () => {
    window.removeEventListener('message', onMessage)
    observer.disconnect()
    app?.unmount()
  }
}
