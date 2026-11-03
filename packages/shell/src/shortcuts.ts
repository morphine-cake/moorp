/** Figma's keyboard shortcuts, as far as Moorp has the feature. `mod` is Cmd on macOS and Ctrl elsewhere. */
export type KeyLike = { key: string; code: string; metaKey: boolean; ctrlKey: boolean; shiftKey: boolean; altKey: boolean }

export type Action =
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'duplicate' }
  | { type: 'copy' }
  | { type: 'paste' }
  | { type: 'rename' }
  | { type: 'delete' }
  | { type: 'deselect' }
  | { type: 'nudge'; dx: number; dy: number }
  | { type: 'next' }
  | { type: 'previous' }
  | { type: 'zoomFit' }
  | { type: 'zoomSelection' }
  | { type: 'zoom100' }
  | { type: 'zoomIn' }
  | { type: 'zoomOut' }
  | { type: 'toggleUI' }
  | { type: 'addFrame' }

const NUDGE = 1
const BIG_NUDGE = 10

export function matchShortcut(e: KeyLike): Action | null {
  const mod = e.metaKey || e.ctrlKey
  const key = e.key.toLowerCase()

  if (mod) {
    if (e.altKey) return null
    if (key === 'z') return { type: e.shiftKey ? 'redo' : 'undo' }
    if (key === 'y' && !e.shiftKey) return { type: 'redo' }
    if (e.shiftKey) return null
    if (key === 'd') return { type: 'duplicate' }
    if (key === 'c') return { type: 'copy' }
    if (key === 'v') return { type: 'paste' }
    if (key === 'r') return { type: 'rename' }
    if (e.code === 'Equal' || key === '=' || key === '+') return { type: 'zoomIn' }
    if (e.code === 'Minus' || key === '-') return { type: 'zoomOut' }
    if (e.code === 'Backslash' || key === '\\') return { type: 'toggleUI' }
    return null
  }
  if (e.altKey) return null

  // Shift+digit: use the physical key, because the character depends on the keyboard layout.
  if (e.shiftKey) {
    if (e.code === 'Digit0') return { type: 'zoom100' }
    if (e.code === 'Digit1') return { type: 'zoomFit' }
    if (e.code === 'Digit2') return { type: 'zoomSelection' }
  }

  const step = e.shiftKey ? BIG_NUDGE : NUDGE
  switch (e.key) {
    case 'Delete':
    case 'Backspace':
      return { type: 'delete' }
    case 'Escape':
      return { type: 'deselect' }
    case 'Tab':
      return { type: e.shiftKey ? 'previous' : 'next' }
    case 'ArrowLeft':
      return { type: 'nudge', dx: -step, dy: 0 }
    case 'ArrowRight':
      return { type: 'nudge', dx: step, dy: 0 }
    case 'ArrowUp':
      return { type: 'nudge', dx: 0, dy: -step }
    case 'ArrowDown':
      return { type: 'nudge', dx: 0, dy: step }
  }
  if (key === 'f' && !e.shiftKey) return { type: 'addFrame' }
  return null
}
