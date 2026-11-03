import { mkdirSync, readdirSync, readFileSync, realpathSync, renameSync, rmSync, rmdirSync, writeFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { createEmptyCanvas, isValidCanvasPath, validateCanvas, type Canvas } from '@moorp/core'
import { HttpError } from './http.ts'

const SUFFIX = '.canvas.json'

/** File-based canvas manifests under `<root>/.visual-canvas/canvases/**.canvas.json`. */
export function createCanvasStore(root: string) {
  const dir = path.join(root, '.visual-canvas', 'canvases')

  function fileFor(canvasPath: unknown): string {
    if (!isValidCanvasPath(canvasPath)) throw new HttpError(400, 'invalid canvas path')
    const file = path.join(dir, ...canvasPath.split('/')) + SUFFIX
    if (path.relative(dir, file).startsWith('..')) throw new HttpError(403, 'path escapes the canvases folder')
    // A symlink inside the folder must not lead outside it.
    let probe = path.dirname(file)
    while (!existsSync(probe) && probe !== dir) probe = path.dirname(probe)
    if (existsSync(probe) && existsSync(dir) && path.relative(realpathSync(dir), realpathSync(probe)).startsWith('..')) {
      throw new HttpError(403, 'path escapes the canvases folder')
    }
    return file
  }

  function pathOf(file: string): string | null {
    const rel = path.relative(dir, file)
    if (rel.startsWith('..') || !rel.endsWith(SUFFIX)) return null
    const p = rel.slice(0, -SUFFIX.length).split(path.sep).join('/')
    return isValidCanvasPath(p) ? p : null
  }

  function list(): string[] {
    const out: string[] = []
    const walk = (d: string) => {
      if (!existsSync(d)) return
      for (const e of readdirSync(d, { withFileTypes: true })) {
        const full = path.join(d, e.name)
        if (e.isSymbolicLink()) continue
        if (e.isDirectory()) walk(full)
        else if (e.isFile()) {
          const p = pathOf(full)
          if (p) out.push(p)
        }
      }
    }
    walk(dir)
    return out.sort((a, b) => a.localeCompare(b))
  }

  function read(canvasPath: string): { canvas: unknown; errors: string[] } {
    const file = fileFor(canvasPath)
    if (!existsSync(file)) throw new HttpError(404, 'canvas not found')
    let canvas: unknown
    try {
      canvas = JSON.parse(readFileSync(file, 'utf8'))
    } catch {
      return { canvas: null, errors: ['file is not valid JSON'] }
    }
    return { canvas, errors: validateCanvas(canvas) }
  }

  function writeAtomic(file: string, canvas: Canvas) {
    mkdirSync(path.dirname(file), { recursive: true })
    const tmp = `${file}.${process.pid}.tmp`
    writeFileSync(tmp, JSON.stringify(canvas, null, 2) + '\n')
    renameSync(tmp, file)
  }

  function write(canvasPath: string, canvas: unknown): void {
    const errors = validateCanvas(canvas)
    if (errors.length) throw new HttpError(422, errors.join('; '))
    const file = fileFor(canvasPath)
    if (!existsSync(file)) throw new HttpError(404, 'canvas not found')
    writeAtomic(file, canvas as Canvas)
  }

  function create(canvasPath: string): void {
    const file = fileFor(canvasPath)
    if (existsSync(file)) throw new HttpError(409, 'canvas already exists')
    writeAtomic(file, createEmptyCanvas())
  }

  /** Removes folders left empty by a delete or rename, up to (not including) the canvases root. */
  function pruneEmpty(from: string) {
    for (let d = from; d !== dir && !path.relative(dir, d).startsWith('..'); d = path.dirname(d)) {
      if (!existsSync(d) || readdirSync(d).length) return
      rmdirSync(d)
    }
  }

  function remove(canvasPath: string): void {
    const file = fileFor(canvasPath)
    if (!existsSync(file)) throw new HttpError(404, 'canvas not found')
    rmSync(file)
    pruneEmpty(path.dirname(file))
  }

  function rename(from: string, to: string): void {
    const a = fileFor(from)
    const b = fileFor(to)
    if (!existsSync(a)) throw new HttpError(404, 'canvas not found')
    if (existsSync(b)) throw new HttpError(409, 'a canvas with that name already exists')
    mkdirSync(path.dirname(b), { recursive: true })
    renameSync(a, b)
    pruneEmpty(path.dirname(a))
  }

  return { dir, list, read, write, create, remove, rename, pathOf }
}

export type CanvasStore = ReturnType<typeof createCanvasStore>
