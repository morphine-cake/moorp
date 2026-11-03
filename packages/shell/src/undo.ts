/** A linear undo/redo history over immutable snapshots (the shell stores canvases as JSON strings). */
export function createUndoStack<T>(limit = 100) {
  let past: T[] = []
  let future: T[] = []

  return {
    /** Remember `snapshot` as a state to come back to. Starts a new branch: redo is dropped. */
    record(snapshot: T) {
      if (past[past.length - 1] === snapshot) return
      past.push(snapshot)
      if (past.length > limit) past.shift()
      future = []
    },
    /** Step back: returns the previous snapshot (or undefined) and keeps `current` for redo. */
    undo(current: T): T | undefined {
      // Snapshots equal to the current state (a gesture that changed nothing) are skipped, not offered as a no-op step.
      let previous = past.pop()
      while (previous !== undefined && previous === current) previous = past.pop()
      if (previous === undefined) return undefined
      future.push(current)
      return previous
    },
    /** Step forward again: returns the snapshot that was undone (or undefined) and keeps `current` for undo. */
    redo(current: T): T | undefined {
      let next = future.pop()
      while (next !== undefined && next === current) next = future.pop()
      if (next === undefined) return undefined
      past.push(current)
      return next
    },
    clear() {
      past = []
      future = []
    },
    get canUndo() {
      return past.length > 0
    },
    get canRedo() {
      return future.length > 0
    },
  }
}
