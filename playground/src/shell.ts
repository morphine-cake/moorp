import { PROTOCOL, isProtocolMessage, validateCanvas, type Canvas, type Frame } from '@moorp/core'

const canvases = import.meta.glob('/.visual-canvas/canvases/**/*.canvas.json', { eager: true, import: 'default' })
const host = document.getElementById('canvas')!
host.style.cssText = 'position:relative;width:100vw;height:100vh;background:#f4f4f5;overflow:auto'

const frames = new Map<string, HTMLIFrameElement>()
const log = (...a: unknown[]) => ((window as unknown as { __moorp: unknown[][] }).__moorp ??= []).push(a)

function render(canvas: Canvas) {
  const errors = validateCanvas(canvas)
  if (errors.length) return void (host.textContent = 'Invalid canvas: ' + errors.join('; '))
  host.replaceChildren()
  frames.clear()
  for (const f of canvas.frames) addFrame(f)
}

function addFrame(f: Frame) {
  const box = document.createElement('div')
  box.style.cssText = `position:absolute;left:${f.x}px;top:${f.y}px;`
  const bar = document.createElement('div')
  bar.textContent = `${f.name} (${f.id})`
  bar.style.cssText = 'font:12px system-ui;color:#555;padding:2px 4px'
  const iframe = document.createElement('iframe')
  iframe.dataset.frameId = f.id
  const p = f.presentation ?? {}
  iframe.style.cssText = `border:0;background:${p.background ?? 'transparent'};width:${typeof f.width === 'number' ? f.width + 'px' : '120px'};height:${typeof f.height === 'number' ? f.height + 'px' : '60px'}`
  iframe.src = '/preview.html'
  iframe.addEventListener('load', () => {
    if (f.source) iframe.contentWindow!.postMessage({ protocol: PROTOCOL, type: 'init', frameId: f.id, source: f.source }, '*')
  })
  frames.set(f.id, iframe)
  box.append(bar, iframe)
  host.append(box)
}

window.addEventListener('message', (e) => {
  if (!isProtocolMessage(e.data)) return
  log(e.data.type, e.data.frameId)
  const iframe = frames.get(e.data.frameId)
  if (e.data.type === 'size' && iframe) {
    const f = e.data
    iframe.style.width = Math.ceil(f.width) + 'px'
    iframe.style.height = Math.ceil(f.height) + 'px'
  }
})

render(Object.values(canvases)[0] as Canvas)
