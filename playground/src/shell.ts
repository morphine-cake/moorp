import { PROTOCOL, isProtocolMessage, validateCanvas, type Canvas, type Frame } from '@moorp/core'

const canvases = import.meta.glob('/.visual-canvas/canvases/**/*.canvas.json', { eager: true, import: 'default' })
const host = document.getElementById('canvas')!
host.style.cssText = 'position:relative;width:100vw;height:100vh;background:#f4f4f5;overflow:hidden;touch-action:none'
const world = document.createElement('div')
world.id = 'world'
world.style.cssText = 'position:absolute;left:0;top:0;transform-origin:0 0'
host.append(world)

// Canvas view state, kept across shell HMR.
const view: { tx: number; ty: number; s: number } = import.meta.hot?.data.view ?? { tx: 40, ty: 40, s: 1 }
if (import.meta.hot) import.meta.hot.data.view = view
const applyView = () => (world.style.transform = `translate(${view.tx}px,${view.ty}px) scale(${view.s})`)
applyView()

function zoomAt(cx: number, cy: number, deltaY: number) {
  const next = Math.min(4, Math.max(0.1, view.s * Math.exp(-deltaY * 0.01)))
  view.tx = cx - ((cx - view.tx) * next) / view.s
  view.ty = cy - ((cy - view.ty) * next) / view.s
  view.s = next
  applyView()
}

// Wheel on the canvas itself (iframes keep their own scroll): ctrl/pinch zooms, otherwise pans.
host.addEventListener('wheel', (e) => {
  e.preventDefault()
  if (e.ctrlKey || e.metaKey) zoomAt(e.clientX, e.clientY, e.deltaY)
  else (view.tx -= e.deltaX, (view.ty -= e.deltaY), applyView())
}, { passive: false })

// Drag: empty canvas pans, a frame's toolbar moves that frame. Iframes ignore the pointer meanwhile.
function beginDrag(e: PointerEvent, onMove: (dx: number, dy: number) => void) {
  const el = e.currentTarget as HTMLElement
  el.setPointerCapture(e.pointerId)
  let lx = e.clientX, ly = e.clientY
  const iframes = [...frames.values()].map((f) => f.iframe)
  iframes.forEach((i) => (i.style.pointerEvents = 'none'))
  const move = (m: PointerEvent) => { onMove(m.clientX - lx, m.clientY - ly); lx = m.clientX; ly = m.clientY }
  const up = () => {
    iframes.forEach((i) => (i.style.pointerEvents = ''))
    el.removeEventListener('pointermove', move)
    el.removeEventListener('pointerup', up)
  }
  el.addEventListener('pointermove', move)
  el.addEventListener('pointerup', up)
}
host.addEventListener('pointerdown', (e) => {
  if (e.target !== host && e.target !== world) return
  beginDrag(e, (dx, dy) => ((view.tx += dx), (view.ty += dy), applyView()))
})

type Entry = { box: HTMLElement; bar: HTMLElement; iframe: HTMLIFrameElement; signature: string; hugW: boolean; hugH: boolean }
// Kept across shell HMR so edits to a manifest update frames in place instead of reloading them.
const frames: Map<string, Entry> = import.meta.hot?.data.frames ?? new Map()
if (import.meta.hot) import.meta.hot.data.frames = frames

const banner = document.getElementById('moorp-error') ?? host.parentElement!.insertBefore(Object.assign(document.createElement('div'), { id: 'moorp-error' }), host)
banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:10;background:#fee2e2;color:#991b1b;font:12px system-ui;padding:4px 8px;display:none'

function showError(msg: string) {
  banner.textContent = msg
  banner.style.display = 'block'
  setTimeout(() => (banner.style.display = 'none'), 4000)
}

const log = (...a: unknown[]) => ((window as unknown as { __moorp: unknown[][] }).__moorp ??= []).push(a)

function render(canvas: Canvas) {
  const errors = validateCanvas(canvas)
  if (errors.length) {
    // Keep the last good layout on screen; just report the problem.
    banner.textContent = 'Invalid canvas, showing last valid layout: ' + errors.join('; ')
    banner.style.display = 'block'
    return
  }
  banner.style.display = 'none'
  const ids = new Set(canvas.frames.map((f) => f.id))
  for (const [id, entry] of frames) if (!ids.has(id)) (entry.box.remove(), frames.delete(id))
  for (const f of canvas.frames) upsertFrame(f)
}

function sig(f: Frame) {
  return JSON.stringify([f.type, f.url, f.source, f.scenario, f.width === 'hug', f.height === 'hug'])
}

function upsertFrame(f: Frame) {
  let entry = frames.get(f.id)
  if (entry && entry.signature !== sig(f)) (entry.box.remove(), frames.delete(f.id), (entry = undefined))
  if (!entry) entry = createFrame(f)
  entry.box.style.left = f.x + 'px'
  entry.box.style.top = f.y + 'px'
  entry.bar.textContent = `${f.name} (${f.id})`
  entry.iframe.style.background = f.presentation?.background ?? 'transparent'
  if (typeof f.width === 'number') entry.iframe.style.width = f.width + 'px'
  if (typeof f.height === 'number') entry.iframe.style.height = f.height + 'px'
}

function createFrame(f: Frame): Entry {
  const box = document.createElement('div')
  box.style.position = 'absolute'
  const bar = document.createElement('div')
  bar.style.cssText = 'font:12px system-ui;color:#555;padding:2px 4px'
  bar.style.cursor = 'grab'
  bar.style.userSelect = 'none'
  bar.addEventListener('pointerdown', (e) => beginDrag(e, (dx, dy) => {
    box.style.left = parseFloat(box.style.left) + dx / view.s + 'px'
    box.style.top = parseFloat(box.style.top) + dy / view.s + 'px'
  }))
  const open = document.createElement('button')
  open.textContent = 'Open source'
  open.hidden = !(f.type === 'design' && f.source)
  open.style.cssText = 'margin-left:8px;font:11px system-ui;cursor:pointer'
  open.addEventListener('pointerdown', (e) => e.stopPropagation())
  open.addEventListener('click', async () => {
    const r = await fetch('/__moorp/open-source', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ file: f.source?.file }) })
    if (!r.ok) showError(`Open source failed: ${((await r.json()) as { error: string }).error}`)
  })
  const iframe = document.createElement('iframe')
  iframe.dataset.frameId = f.id
  iframe.style.border = '0'
  const hug = f.type === 'design' && (f.width === 'hug' || f.height === 'hug')
  // Hug frames start large so content is measured unconstrained, then shrink on `size`.
  if (hug && f.width === 'hug') iframe.style.width = '2000px'
  if (hug && f.height === 'hug') iframe.style.height = '2000px'
  if (f.type === 'page') {
    // Page Frame: a real browsing context at the given URL; flag pages that refuse embedding.
    iframe.src = f.url!
    void fetch('/__moorp/frame-check?url=' + encodeURIComponent(f.url!))
      .then((r) => r.json() as Promise<{ embeddable: boolean; reason: string }>)
      .then((r) => {
        if (r.embeddable) return
        const note = document.createElement('div')
        note.className = 'moorp-blocked'
        note.textContent = `Cannot embed ${f.url}: ${r.reason}`
        note.style.cssText = 'position:absolute;inset:20px 0 0 0;background:#fef2f2;color:#991b1b;font:12px system-ui;padding:8px;box-sizing:border-box'
        box.append(note)
      })
      .catch(() => {})
  } else iframe.src = '/preview.html'
  iframe.addEventListener('load', () => {
    if (f.type === 'design' && f.source) iframe.contentWindow!.postMessage({ protocol: PROTOCOL, type: 'init', frameId: f.id, source: f.source, scenario: f.scenario, hug }, '*')
  })
  const title = document.createElement('span')
  bar.append(title, open)
  box.append(bar, iframe)
  world.append(box)
  const entry = { box, bar: title, iframe, signature: sig(f), hugW: hug && f.width === 'hug', hugH: hug && f.height === 'hug' }
  frames.set(f.id, entry)
  return entry
}

window.addEventListener('message', (e) => {
  if (!isProtocolMessage(e.data)) return
  log(e.data.type, e.data.frameId)
  const entry = frames.get(e.data.frameId)
  if (e.data.type === 'zoom' && entry) {
    // Iframe coords -> screen coords: offset by the iframe's rect plus the canvas scale.
    const r = entry.iframe.getBoundingClientRect()
    zoomAt(r.left + e.data.clientX * view.s, r.top + e.data.clientY * view.s, e.data.deltaY)
  }
  if (e.data.type === 'size' && entry) {
    if (entry.hugW) entry.iframe.style.width = Math.ceil(e.data.width) + 'px'
    if (entry.hugH) entry.iframe.style.height = Math.ceil(e.data.height) + 'px'
  }
})

render(Object.values(canvases)[0] as Canvas)
import.meta.hot?.accept()
