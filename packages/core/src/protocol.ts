// Preview protocol between the canvas shell and a frame's preview iframe (postMessage).
import type { Presentation } from './manifest.ts'

export const PROTOCOL = 'moorp/1'

export type ShellToPreview =
  | { protocol: typeof PROTOCOL; type: 'init'; frameId: string; source: { file: string; export?: string }; scenario?: string; hug: boolean; presentation?: Presentation; props?: Record<string, unknown> }
  /** Frame presentation or props changed; the component is not remounted. */
  | { protocol: typeof PROTOCOL; type: 'update'; frameId: string; presentation?: Presentation; props?: Record<string, unknown> }
  | { protocol: typeof PROTOCOL; type: 'dispose'; frameId: string }

export type PreviewToShell =
  | { protocol: typeof PROTOCOL; type: 'ready'; frameId: string }
  | { protocol: typeof PROTOCOL; type: 'size'; frameId: string; width: number; height: number }
  | { protocol: typeof PROTOCOL; type: 'error'; frameId: string; message: string }
  | { protocol: typeof PROTOCOL; type: 'hmr'; frameId: string }
  /** Pinch / ctrl+wheel inside a frame, forwarded so the canvas can zoom. Coordinates are in the iframe's own CSS pixels. */
  | { protocol: typeof PROTOCOL; type: 'zoom'; frameId: string; deltaY: number; clientX: number; clientY: number }
  /** A shortcut key pressed inside the preview, forwarded so canvas shortcuts keep working while a component has focus. */
  | { protocol: typeof PROTOCOL; type: 'key'; frameId: string; key: string; code: string; metaKey: boolean; ctrlKey: boolean; shiftKey: boolean; altKey: boolean }

export function isProtocolMessage(data: unknown): data is ShellToPreview | PreviewToShell {
  return typeof data === 'object' && data !== null && (data as { protocol?: unknown }).protocol === PROTOCOL
}
