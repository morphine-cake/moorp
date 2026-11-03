// Draft schema (page 08 of the spec): not yet approved, validated by the Phase 0 spike.

export type FrameType = 'page' | 'design'

export type SourceRef = {
  file: string
  export?: string
}

export type Presentation = {
  background?: string
  padding?: number
  alignment?: 'start' | 'center' | 'end'
  overflow?: 'visible' | 'hidden' | 'scroll'
}

export type Frame = {
  /** Immutable technical id, e.g. `frame-34`. */
  id: string
  /** Editable display name. */
  name: string
  type: FrameType
  /** Null until Claude Code/Codex (or the user) binds a source. */
  source: SourceRef | null
  /** For page frames, the URL or route to embed. */
  url?: string
  x: number
  y: number
  width: number | 'hug'
  height: number | 'hug'
  presentation?: Presentation
  scenario?: string
}

export type Canvas = {
  version: 1
  frames: Frame[]
}

export function createEmptyCanvas(): Canvas {
  return { version: 1, frames: [] }
}

/** Next unused `frame-N` id for a canvas. Ids are never reused after deletion by callers that track a max. */
export function nextFrameId(canvas: Canvas): string {
  let max = 0
  for (const f of canvas.frames) {
    const m = /^frame-(\d+)$/.exec(f.id)
    if (m) max = Math.max(max, Number(m[1]))
  }
  return `frame-${max + 1}`
}

/** Returns a list of problems; empty means valid. Meant for hand-edited manifests. */
export function validateCanvas(input: unknown): string[] {
  const errors: string[] = []
  if (typeof input !== 'object' || input === null) return ['canvas must be an object']
  const c = input as Record<string, unknown>
  if (c.version !== 1) errors.push('version must be 1')
  if (!Array.isArray(c.frames)) return [...errors, 'frames must be an array']
  const seen = new Set<string>()
  c.frames.forEach((raw, i) => {
    const p = `frames[${i}]`
    if (typeof raw !== 'object' || raw === null) return void errors.push(`${p} must be an object`)
    const f = raw as Record<string, unknown>
    if (typeof f.id !== 'string' || !/^frame-\d+$/.test(f.id)) errors.push(`${p}.id must match frame-<n>`)
    else if (seen.has(f.id)) errors.push(`${p}.id "${f.id}" is duplicated`)
    else seen.add(f.id)
    if (typeof f.name !== 'string') errors.push(`${p}.name must be a string`)
    if (f.type !== 'page' && f.type !== 'design') errors.push(`${p}.type must be "page" or "design"`)
    if (f.type === 'page' && typeof f.url !== 'string') errors.push(`${p}.url is required for page frames`)
    if (f.source !== null) {
      const s = f.source as Record<string, unknown> | undefined
      if (typeof s !== 'object' || s === null || typeof s.file !== 'string') errors.push(`${p}.source must be null or { file }`)
    }
    for (const k of ['x', 'y'] as const) if (typeof f[k] !== 'number') errors.push(`${p}.${k} must be a number`)
    for (const k of ['width', 'height'] as const) {
      if (typeof f[k] !== 'number' && f[k] !== 'hug') errors.push(`${p}.${k} must be a number or "hug"`)
    }
  })
  return errors
}

/** A copy of a frame with a new id and name, offset so it does not sit on top of the original. Source files are never copied. */
export function duplicateFrame(canvas: Canvas, id: string): Frame | null {
  const original = canvas.frames.find((f) => f.id === id)
  if (!original) return null
  return {
    // JSON clone (not structuredClone): callers may pass a reactive proxy, which structuredClone rejects.
    ...(JSON.parse(JSON.stringify(original)) as Frame),
    id: nextFrameId(canvas),
    name: `${original.name} copy`,
    x: original.x + 40,
    y: original.y + 40,
  }
}

/** Canvas paths look like `Folder/Sub/Name` (no extension): letters, digits, space, `-`, `_`, `.` inside names, `/` between them. */
export function isValidCanvasPath(path: unknown): path is string {
  if (typeof path !== 'string' || path.length === 0 || path.length > 200) return false
  return path.split('/').every((part) => /^[\w][\w .-]*$/.test(part) && part !== '.' && part !== '..' && !part.endsWith('.') && !part.endsWith(' '))
}
