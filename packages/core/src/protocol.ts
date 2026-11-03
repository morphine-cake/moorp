// Preview protocol between the canvas shell and a frame's preview iframe (postMessage).

export const PROTOCOL = 'moorp/1'

export type ShellToPreview =
  | { protocol: typeof PROTOCOL; type: 'init'; frameId: string; source: { file: string; export?: string }; scenario?: string }
  | { protocol: typeof PROTOCOL; type: 'update'; frameId: string }
  | { protocol: typeof PROTOCOL; type: 'dispose'; frameId: string }

export type PreviewToShell =
  | { protocol: typeof PROTOCOL; type: 'ready'; frameId: string }
  | { protocol: typeof PROTOCOL; type: 'size'; frameId: string; width: number; height: number }
  | { protocol: typeof PROTOCOL; type: 'error'; frameId: string; message: string }
  | { protocol: typeof PROTOCOL; type: 'hmr'; frameId: string }

export function isProtocolMessage(data: unknown): data is ShellToPreview | PreviewToShell {
  return typeof data === 'object' && data !== null && (data as { protocol?: unknown }).protocol === PROTOCOL
}
