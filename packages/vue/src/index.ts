import { createApp, h, reactive, type App, type Component } from 'vue'
import { PROTOCOL, isProtocolMessage, type Presentation, type PreviewToShell } from '@moorp/core'

export type ComponentLoader = (file: string, exportName?: string) => Promise<Component>

/** What a frame tells `setup`, so one preview can be configured per frame (locale, store seed, theme provider). */
export type PreviewContext = {
  frameId: string
  /** The frame's `scenario` name, if any. */
  scenario?: string
  /** The frame's `props`. */
  props: Record<string, unknown>
}

export type PreviewOptions = {
  /** Resolves a manifest source ref to a component. Supplied by the dev-server integration (a dev-server URL import). */
  load: ComponentLoader
  /** Called with the app before mount: install router, pinia, i18n etc. (the `preview.ts` context), and the frame's context. */
  setup?: (app: App, context: PreviewContext) => void
  root: HTMLElement
}

/** Boots a preview iframe: waits for `init`, mounts the component, reports size and errors to the shell. */
export function startPreview({ load, setup, root }: PreviewOptions): () => void {
  let app: App | null = null
  let frameId = ''
  const post = (msg: Omit<PreviewToShell, 'protocol' | 'frameId'> & { type: PreviewToShell['type'] }) =>
    window.parent.postMessage({ protocol: PROTOCOL, frameId, ...msg }, '*')

  // Border box, so frame padding counts towards the size a hug frame reports.
  const observer = new ResizeObserver(([entry]) => {
    const box = entry?.borderBoxSize?.[0]
    if (entry) post({ type: 'size', width: box?.inlineSize ?? entry.contentRect.width, height: box?.blockSize ?? entry.contentRect.height } as never)
  })

  let hug = false
  let scenario: string | undefined
  // Reactive so a props edit re-renders the mounted component instead of remounting it.
  const props = reactive<Record<string, unknown>>({})
  function setProps(next: Record<string, unknown> = {}) {
    for (const k of Object.keys(props)) if (!(k in next)) delete props[k]
    Object.assign(props, next)
  }
  /** `class` is additive (other classes on <html> stay); other attributes are set or removed. */
  function applyHtmlAttributes(html: HTMLElement, next: Record<string, string>) {
    const tokens = (v?: string) => (v ?? '').split(/\s+/).filter(Boolean)
    for (const [name, value] of Object.entries(appliedAttrs)) {
      if (name === 'class') tokens(value).filter((t) => !tokens(next.class).includes(t)).forEach((t) => html.classList.remove(t))
      else if (!(name in next)) html.removeAttribute(name)
    }
    for (const [name, value] of Object.entries(next)) {
      if (name === 'class') tokens(value).forEach((t) => html.classList.add(t))
      else html.setAttribute(name, value)
    }
    appliedAttrs = { ...next }
  }

  /** Frame presentation lives in the preview document, around the component, never in the component's own CSS. */
  let appliedAttrs: Record<string, string> = {}
  function applyPresentation(p: Presentation = {}) {
    const html = document.documentElement
    applyHtmlAttributes(html, p.htmlAttributes ?? {})
    html.style.background = p.background ?? ''
    html.style.overflow = p.overflow === 'hidden' ? 'hidden' : p.overflow === 'scroll' ? 'scroll' : ''
    root.style.boxSizing = 'border-box'
    root.style.padding = p.padding ? `${p.padding}px` : ''
    // Hug: root shrinks to its content so the reported size is the content's, not the iframe's.
    if (hug) root.style.display = 'inline-block'
    else if (p.alignment) {
      root.style.display = 'flex'
      root.style.justifyContent = p.alignment === 'start' ? 'flex-start' : p.alignment === 'end' ? 'flex-end' : 'center'
    } else {
      root.style.display = 'block'
      root.style.justifyContent = ''
    }
  }

  async function mount(file: string, exportName?: string) {
    app?.unmount()
    try {
      const component = await load(file, exportName)
      app = createApp({ render: () => h(component, props) })
      app.config.errorHandler = (err) => post({ type: 'error', message: String(err) } as never)
      setup?.(app, { frameId, scenario, props: { ...props } })
      app.mount(root)
      observer.observe(root, { box: 'border-box' })
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
      hug = msg.hug
      scenario = msg.scenario
      applyPresentation(msg.presentation)
      setProps(msg.props)
      void mount(msg.source.file, msg.source.export)
    } else if (msg.type === 'update') {
      applyPresentation(msg.presentation)
      setProps(msg.props)
    } else if (msg.type === 'dispose') {
      app?.unmount()
      app = null
    }
  }
  // Plain scrolling stays with the component; only pinch / ctrl+wheel is handed to the canvas.
  const onWheel = (e: WheelEvent) => {
    if (!e.ctrlKey && !e.metaKey) return
    e.preventDefault()
    post({ type: 'zoom', deltaY: e.deltaY, clientX: e.clientX, clientY: e.clientY } as never)
  }
  // Canvas shortcuts must keep working after a click inside a component moves focus into this iframe.
  // Forward only keys a component is unlikely to need, and never while the user is typing.
  const onKey = (e: KeyboardEvent) => {
    const t = e.target as HTMLElement | null
    if (t?.closest?.('input, textarea, select, [contenteditable="true"]')) return
    const mod = e.metaKey || e.ctrlKey
    const idle = t === document.body || t === document.documentElement
    const forward =
      (mod && !e.altKey && ['z', 'y', 'd', 'r', '=', '+', '-', '\\'].includes(e.key.toLowerCase())) ||
      (e.shiftKey && !mod && ['Digit0', 'Digit1', 'Digit2'].includes(e.code)) ||
      (idle && ['Escape', 'Delete', 'Backspace'].includes(e.key))
    if (!forward) return
    e.preventDefault() // otherwise the browser reloads, bookmarks or zooms the page
    post({ type: 'key', key: e.key, code: e.code, metaKey: e.metaKey, ctrlKey: e.ctrlKey, shiftKey: e.shiftKey, altKey: e.altKey } as never)
  }
  window.addEventListener('message', onMessage)
  window.addEventListener('wheel', onWheel, { passive: false })
  window.addEventListener('keydown', onKey)
  return () => {
    window.removeEventListener('message', onMessage)
    window.removeEventListener('wheel', onWheel)
    window.removeEventListener('keydown', onKey)
    observer.disconnect()
    app?.unmount()
  }
}
