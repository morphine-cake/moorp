import type { Canvas } from '@moorp/core'

const BASE = '/__moorp/api'

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(BASE + url, init)
  const body = (await r.json().catch(() => ({}))) as T & { error?: string }
  if (!r.ok) throw new Error(body.error ?? `request failed (${r.status})`)
  return body
}

const json = (method: string, body?: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: body === undefined ? undefined : JSON.stringify(body),
})
const q = (path: string) => `?path=${encodeURIComponent(path)}`

export type Info = { root: string; adapter: string; hasPreviewSetup: boolean }
export type FrameCheck = { embeddable: boolean; reason: string; checked?: boolean }

export const api = {
  info: () => request<Info>('/info'),
  list: () => request<{ canvases: string[] }>('/canvases').then((r) => r.canvases),
  get: (path: string) => request<{ canvas: Canvas | null; errors: string[] }>('/canvas' + q(path)),
  save: (path: string, canvas: Canvas) => request<{ ok: true }>('/canvas' + q(path), json('PUT', canvas)),
  create: (path: string) => request<{ ok: true }>('/canvas' + q(path), json('POST')),
  remove: (path: string) => request<{ ok: true }>('/canvas' + q(path), { method: 'DELETE' }),
  rename: (from: string, to: string) => request<{ ok: true }>('/canvas/rename', json('POST', { from, to })),
  openSource: (file: string) => request<{ opened: string }>('/open-source', json('POST', { file })),
}

const checks = new Map<string, Promise<FrameCheck>>()
/** One header check per URL, shared by every frame that embeds it. */
export function checkFrame(url: string): Promise<FrameCheck> {
  let p = checks.get(url)
  if (!p) {
    p = request<FrameCheck>('/frame-check?url=' + encodeURIComponent(url))
    checks.set(url, p)
  }
  return p
}

export function subscribe(onCanvas: (path: string) => void): () => void {
  const es = new EventSource(BASE + '/events')
  es.onmessage = (e) => {
    try {
      const msg = JSON.parse(e.data) as { type: string; path: string }
      if (msg.type === 'canvas') onCanvas(msg.path)
    } catch {
      /* ignore malformed events */
    }
  }
  return () => es.close()
}
