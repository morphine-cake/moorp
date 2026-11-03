import { computed, reactive, watch } from 'vue'
import { duplicateFrame, isValidCanvasPath, nextFrameId, type Canvas, type Frame, type Presentation } from '@moorp/core'
import { api, subscribe, type Info } from './api'

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
  error: '',
})

export const selectedFrame = computed(() => state.canvas?.frames.find((f) => f.id === state.selected) ?? null)

const fail = (e: unknown) => (state.error = e instanceof Error ? e.message : String(e))

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

function mutate(fn: (c: Canvas) => void, { immediate = true } = {}) {
  if (!state.canvas) return
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
  }, { immediate: persist })
}

export function resetView() {
  Object.assign(state.view, { tx: 40, ty: 40, s: 1 })
}

export function dismissError() {
  state.error = ''
}
