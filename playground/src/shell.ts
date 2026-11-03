import { PROTOCOL, isProtocolMessage, validateCanvas, type Canvas, type Frame } from '@moorp/core'

const canvases = import.meta.glob('/.visual-canvas/canvases/**/*.canvas.json', { eager: true, import: 'default' })
const host = document.getElementById('canvas')!
host.style.cssText = 'position:relative;width:100vw;height:100vh;background:#f4f4f5;overflow:auto'

type Entry = { box: HTMLElement; bar: HTMLElement; iframe: HTMLIFrameElement; signature: string; hugW: boolean; hugH: boolean }
// Kept across shell HMR so edits to a manifest update frames in place instead of reloading them.
const frames: Map<string, Entry> = import.meta.hot?.data.frames ?? new Map()
if (import.meta.hot) import.meta.hot.data.frames = frames

const banner = document.getElementById('moorp-error') ?? host.parentElement!.insertBefore(Object.assign(document.createElement('div'), { id: 'moorp-error' }), host)
banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:10;background:#fee2e2;color:#991b1b;font:12px system-ui;padding:4px 8px;display:none'

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
  return JSON.stringify([f.type, f.source, f.scenario, f.width === 'hug', f.height === 'hug'])
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
  const iframe = document.createElement('iframe')
  iframe.dataset.frameId = f.id
  iframe.style.border = '0'
  const hug = f.width === 'hug' || f.height === 'hug'
  // Hug frames start large so content is measured unconstrained, then shrink on `size`.
  if (f.width === 'hug') iframe.style.width = '2000px'
  if (f.height === 'hug') iframe.style.height = '2000px'
  iframe.src = '/preview.html'
  iframe.addEventListener('load', () => {
    if (f.source) iframe.contentWindow!.postMessage({ protocol: PROTOCOL, type: 'init', frameId: f.id, source: f.source, scenario: f.scenario, hug }, '*')
  })
  box.append(bar, iframe)
  host.append(box)
  const entry = { box, bar, iframe, signature: sig(f), hugW: f.width === 'hug', hugH: f.height === 'hug' }
  frames.set(f.id, entry)
  return entry
}

window.addEventListener('message', (e) => {
  if (!isProtocolMessage(e.data)) return
  log(e.data.type, e.data.frameId)
  const entry = frames.get(e.data.frameId)
  if (e.data.type === 'size' && entry) {
    if (entry.hugW) entry.iframe.style.width = Math.ceil(e.data.width) + 'px'
    if (entry.hugH) entry.iframe.style.height = Math.ceil(e.data.height) + 'px'
  }
})

render(Object.values(canvases)[0] as Canvas)
import.meta.hot?.accept()
