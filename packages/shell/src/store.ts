import { computed, reactive, watch } from 'vue'
import { duplicateFrame, isValidCanvasPath, nextFrameId, type Canvas, type Frame, type Presentation } from '@moorp/core'
import { api, subscribe, type Info } from './api'
import type { Action } from './shortcuts.ts'
import { createUndoStack } from './undo.ts'

type View = { tx: number; ty: number; s: number }

export const state = reactive({
  info: null as Info | null,
  canvases: [] as string[],
  current: null as string | null,
  canvas: null as Canvas | null,
  selected: null as string | null,
  view: { tx: 40, ty: 40, s: 1 } as View,
  viewport: { w: 800, h: 600 },
  /** True while a frame is being moved or resized, so iframes stop swallowing the pointer. */
  dragging: false,
  /** Space is held: dragging anywhere pans the canvas (Figma's hand tool). */
  spaceDown: false,
  /** Panels hidden (Figma's Cmd+\). */
  hideUI: false,
  /** A frame id whose title should switch to rename mode (Cmd+R). */
  renaming: null as string | null,
  canUndo: false,
  canRedo: false,
  error: '',
})

export const selectedFrame = computed(() => state.canvas?.frames.find((f) => f.id === state.selected) ?? null)

const fail = (e: unknown) => (state.error = e instanceof Error ? e.message : String(e))

// ---- undo / redo -----------------------------------------------------------------------------

// Snapshots are the canvas as JSON text; every edit records the state before it. Edits that arrive
// from outside (a file changed by another tool) or switching canvases clear the history, so an undo
// can never bring back a stale copy over someone else's change.
const undoStack = createUndoStack<string>()
const syncHistory = () => {
  state.canUndo = undoStack.canUndo
  state.canRedo = undoStack.canRedo
}
function snapshot() {
  if (!state.canvas) return
  undoStack.record(JSON.stringify(state.canvas))
  syncHistory()
}
/** Call once when a drag or resize starts: the whole gesture becomes a single undo step. */
export function beginGesture() {
  snapshot()
}
function applySnapshot(json: string) {
  state.canvas = JSON.parse(json) as Canvas
  if (state.selected && !state.canvas.frames.some((f) => f.id === state.selected)) state.selected = null
  syncHistory()
  scheduleSave()
}
export function undo() {
  if (!state.canvas) return
  const previous = undoStack.undo(JSON.stringify(state.canvas))
  if (previous !== undefined) applySnapshot(previous)
}
export function redo() {
  if (!state.canvas) return
  const next = undoStack.redo(JSON.stringify(state.canvas))
  if (next !== undefined) applySnapshot(next)
}

// ---- persistence -----------------------------------------------------------------------------

let lastSaved = ''
let saveTimer: ReturnType<typeof setTimeout> | undefined
let inflight = 0
/** Bodies this tab wrote recently: their file-watcher echoes (which can arrive out of order) are ignored. */
const recentlySaved = new Set<string>()

function scheduleSave() {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    saveTimer = undefined
    void save()
  }, 150)
}

async function save() {
  if (!state.current || !state.canvas) return
  const body = JSON.stringify(state.canvas)
  if (body === lastSaved) return
  lastSaved = body
  recentlySaved.add(body)
  if (recentlySaved.size > 20) recentlySaved.delete(recentlySaved.values().next().value!)
  inflight++
  try {
    await api.save(state.current, state.canvas)
  } catch (e) {
    fail(`Could not save: ${e instanceof Error ? e.message : e}`)
    lastSaved = ''
    recentlySaved.clear()
    inflight--
    await loadCanvas(state.current)
    return
  }
  inflight--
}

/** Flush a pending save now (used when a drag ends). */
export function commit() {
  clearTimeout(saveTimer)
  saveTimer = undefined
  void save()
}

async function loadCanvas(path: string) {
  const { canvas, errors } = await api.get(path)
  if (errors.length || !canvas) {
    // Keep the last valid layout on screen and say what is wrong with the file.
    state.error = `${path}.canvas.json is invalid, showing the last valid layout: ${errors.join('; ')}`
    return
  }
  const incoming = JSON.stringify(canvas)
  if (state.error.includes('is invalid')) state.error = ''
  if (incoming === lastSaved || incoming === JSON.stringify(state.canvas) || recentlySaved.has(incoming)) return
  // Local edits that are not on disk yet win: an older echo must not overwrite them.
  if (state.dragging || saveTimer !== undefined || inflight > 0) return
  lastSaved = incoming
  state.canvas = canvas
  undoStack.clear()
  syncHistory()
  if (state.selected && !canvas.frames.some((f) => f.id === state.selected)) state.selected = null
}

// ---- navigation ------------------------------------------------------------------------------

const viewKey = (p: string) => `moorp:view:${p}`
function readView(p: string): View {
  try {
    const v = JSON.parse(localStorage.getItem(viewKey(p)) ?? 'null') as View | null
    if (v && [v.tx, v.ty, v.s].every(Number.isFinite)) return v
  } catch { /* no stored view */ }
  return { tx: 40, ty: 40, s: 1 }
}

export async function openCanvas(path: string | null) {
  clearTimeout(saveTimer)
  saveTimer = undefined
  await save()
  state.current = path
  state.selected = null
  state.canvas = null
  lastSaved = ''
  undoStack.clear()
  syncHistory()
  history.replaceState(null, '', path ? `#/${path}` : '#/')
  if (!path) return
  Object.assign(state.view, readView(path))
  try {
    await loadCanvas(path)
  } catch (e) {
    fail(e)
  }
}

export async function refreshList() {
  state.canvases = await api.list()
}

export async function init() {
  try {
    state.info = await api.info()
    await refreshList()
    const fromHash = decodeURIComponent(location.hash.replace(/^#\/?/, ''))
    const first = state.canvases.includes(fromHash) ? fromHash : (state.canvases[0] ?? null)
    await openCanvas(first)
    // Back/forward and edited URLs switch canvases too.
    window.addEventListener('hashchange', () => {
      const p = decodeURIComponent(location.hash.replace(/^#\/?/, ''))
      if (p !== state.current && state.canvases.includes(p)) void openCanvas(p)
    })
    subscribe((path) => {
      void refreshList()
      if (path === state.current) void loadCanvas(path).catch(fail)
    })
  } catch (e) {
    fail(e)
  }
  let viewTimer: ReturnType<typeof setTimeout> | undefined
  watch(state.view, () => {
    clearTimeout(viewTimer)
    viewTimer = setTimeout(() => state.current && localStorage.setItem(viewKey(state.current), JSON.stringify(state.view)), 300)
  })
}

// ---- canvas operations -----------------------------------------------------------------------

export async function createCanvas(path: string) {
  if (!isValidCanvasPath(path)) return fail('Canvas names may use letters, digits, spaces, "-", "_" and "." (use "/" for folders).')
  try {
    await api.create(path)
    await refreshList()
    await openCanvas(path)
  } catch (e) {
    fail(e)
  }
}

export async function renameCanvas(from: string, to: string) {
  if (from === to) return
  if (!isValidCanvasPath(to)) return fail('Invalid canvas name.')
  try {
    await api.rename(from, to)
    await refreshList()
    if (state.current === from) {
      state.current = to
      history.replaceState(null, '', `#/${to}`)
    }
  } catch (e) {
    fail(e)
  }
}

export async function deleteCanvas(path: string) {
  try {
    await api.remove(path)
    await refreshList()
    if (state.current === path) await openCanvas(state.canvases[0] ?? null)
  } catch (e) {
    fail(e)
  }
}

// ---- frame operations (canvas metadata only: source files are never touched) ------------------

function mutate(fn: (c: Canvas) => void, { immediate = true, history: record = true } = {}) {
  if (!state.canvas) return
  if (record) snapshot()
  fn(state.canvas)
  immediate ? scheduleSave() : undefined
}

export function addFrame(type: Frame['type']) {
  mutate((c) => {
    const { w, h } = state.viewport
    const { tx, ty, s } = state.view
    const offset = (c.frames.length % 8) * 24
    const x = Math.round((w / 2 - tx) / s - 60 + offset)
    const y = Math.round((h / 2 - ty) / s - 40 + offset)
    const frame: Frame =
      type === 'design'
        ? { id: nextFrameId(c), name: 'Component', type, source: null, x, y, width: 'hug', height: 'hug' }
        : { id: nextFrameId(c), name: 'Page', type, source: null, url: '/', x, y, width: 375, height: 640 }
    c.frames.push(frame)
    state.selected = frame.id
  })
}

export function copyFrame(id: string) {
  mutate((c) => {
    const copy = duplicateFrame(c, id)
    if (copy) {
      c.frames.push(copy)
      state.selected = copy.id
    }
  })
}

export function removeFrame(id: string) {
  mutate((c) => {
    c.frames = c.frames.filter((f) => f.id !== id)
    if (state.selected === id) state.selected = null
  })
}

/** Change frame fields. Pass `save: false` while dragging and call `commit()` when the gesture ends. */
export function patchFrame(id: string, patch: Partial<Omit<Frame, 'id' | 'presentation'>> & { presentation?: Presentation }, { save: persist = true } = {}) {
  mutate((c) => {
    const f = c.frames.find((x) => x.id === id)
    if (!f) return
    const { presentation, ...rest } = patch
    Object.assign(f, rest)
    if (presentation) {
      const merged = { ...f.presentation, ...presentation }
      for (const k of Object.keys(merged) as (keyof Presentation)[]) if (merged[k] === undefined || merged[k] === '' || (k === 'padding' && merged[k] === 0)) delete merged[k]
      if (Object.keys(merged).length) f.presentation = merged
      else delete f.presentation
    }
  }, { immediate: persist, history: persist })
}

/** Open a frame's bound source file in the editor (the panel and the frame bar both use this). */
export async function openFrameSource(id: string) {
  const file = state.canvas?.frames.find((f) => f.id === id)?.source?.file
  if (!file) return
  try {
    await api.openSource(file)
  } catch (e) {
    state.error = `Open source failed: ${e instanceof Error ? e.message : e}`
  }
}

/** Alt+drag (Figma): leave a copy where the frame was, then keep dragging the original. Part of the gesture's undo step. */
export function duplicateInPlace(id: string) {
  mutate((c) => {
    const original = c.frames.find((f) => f.id === id)
    const copy = duplicateFrame(c, id)
    if (original && copy) c.frames.push({ ...copy, x: original.x, y: original.y })
  }, { history: false })
}

// In-memory clipboard: a frame reference (never source files). Survives switching canvases, so a frame can be pasted elsewhere.
let clipboard: Frame | null = null
let pasteCount = 0

export function copySelected() {
  const f = selectedFrame.value
  if (!f) return
  clipboard = JSON.parse(JSON.stringify(f)) as Frame
  pasteCount = 0
}

export function pasteFrame() {
  if (!clipboard || !state.canvas) return
  const source = clipboard
  pasteCount++
  mutate((c) => {
    const frame: Frame = { ...(JSON.parse(JSON.stringify(source)) as Frame), id: nextFrameId(c), x: source.x + 40 * pasteCount, y: source.y + 40 * pasteCount }
    c.frames.push(frame)
    state.selected = frame.id
  })
}

let lastNudge = 0
/** Arrow keys: held or repeated presses within 600 ms are one undo step. */
export function nudgeSelected(dx: number, dy: number) {
  const f = selectedFrame.value
  if (!f) return
  const now = Date.now()
  if (now - lastNudge > 600) snapshot()
  lastNudge = now
  mutate(() => {
    f.x += dx
    f.y += dy
  }, { history: false })
}

export function cycleSelection(direction: 1 | -1) {
  const frames = state.canvas?.frames
  if (!frames?.length) return
  const i = frames.findIndex((f) => f.id === state.selected)
  state.selected = frames[(i + direction + frames.length) % frames.length]!.id
}

/** Zoom around the middle of the canvas area (keyboard zoom), keeping what is there in place. */
function setScale(next: number) {
  const { w, h } = state.viewport
  const v = state.view
  const s = Math.min(4, Math.max(0.02, next))
  v.tx = w / 2 - ((w / 2 - v.tx) * s) / v.s
  v.ty = h / 2 - ((h / 2 - v.ty) * s) / v.s
  v.s = s
}

/** Run a shortcut matched by `matchShortcut`. */
export function runAction(a: Action) {
  switch (a.type) {
    case 'undo': return undo()
    case 'redo': return redo()
    case 'duplicate': return state.selected ? copyFrame(state.selected) : undefined
    case 'copy': return copySelected()
    case 'paste': return pasteFrame()
    case 'rename': return void (state.renaming = state.selected)
    case 'delete': return state.selected ? removeFrame(state.selected) : undefined
    case 'deselect': return void (state.selected = null)
    case 'nudge': return nudgeSelected(a.dx, a.dy)
    case 'next': return cycleSelection(1)
    case 'previous': return cycleSelection(-1)
    case 'zoomFit': return fitFrames()
    case 'zoomSelection': return state.selected ? fitFrames(state.selected) : fitFrames()
    case 'zoom100': return setScale(1)
    case 'zoomIn': return setScale(state.view.s * 1.25)
    case 'zoomOut': return setScale(state.view.s / 1.25)
    case 'toggleUI': return void (state.hideUI = !state.hideUI)
    case 'addFrame': return addFrame('design')
  }
}

/** Zoom and pan so one frame (or all frames) fills the canvas area, measured from what is on screen. */
export function fitFrames(id?: string) {
  const els = [...document.querySelectorAll<HTMLElement>('.frame')].filter((el) => !id || el.dataset.id === id)
  if (!els.length) return
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  for (const el of els) {
    const body = el.querySelector<HTMLElement>('.body')!
    const x = parseFloat(el.style.left)
    const y = parseFloat(el.style.top)
    x0 = Math.min(x0, x)
    y0 = Math.min(y0, y - 28)
    x1 = Math.max(x1, x + body.offsetWidth)
    y1 = Math.max(y1, y + body.offsetHeight)
  }
  const pad = 48
  const { w, h } = state.viewport
  const s = Math.min(4, Math.max(0.02, Math.min((w - 2 * pad) / (x1 - x0), (h - 2 * pad) / (y1 - y0), id ? 2 : 1)))
  state.view.s = s
  state.view.tx = (w - (x1 - x0) * s) / 2 - x0 * s
  state.view.ty = (h - (y1 - y0) * s) / 2 - y0 * s
}

export function resetView() {
  Object.assign(state.view, { tx: 40, ty: 40, s: 1 })
}

export function dismissError() {
  state.error = ''
}
