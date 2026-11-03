import { execFile } from 'node:child_process'
import { realpathSync, statSync } from 'node:fs'
import path from 'node:path'
import { HttpError } from './http.ts'

const ALLOWED_EXT = new Set(['.vue', '.ts', '.tsx', '.js', '.jsx', '.css', '.json', '.html', '.svelte'])

export type Resolved = { ok: true; file: string } | { ok: false; status: number; reason: string }

/** Maps a manifest source path to a real file inside the project, or says why not. */
export function resolveSourcePath(root: string, file: unknown): Resolved {
  if (typeof file !== 'string' || file === '' || file.includes('\0')) return { ok: false, status: 400, reason: 'file must be a non-empty string' }
  if (path.isAbsolute(file)) return { ok: false, status: 403, reason: 'absolute paths are not allowed' }
  const rootReal = realpathSync(root)
  const candidate = path.resolve(rootReal, file)
  if (!candidate.startsWith(rootReal + path.sep)) return { ok: false, status: 403, reason: 'path escapes the project' }
  let real: string
  try {
    real = realpathSync(candidate)
  } catch {
    return { ok: false, status: 404, reason: 'file not found' }
  }
  // Resolve symlinks first, so a link inside the project cannot point outside it.
  if (!real.startsWith(rootReal + path.sep)) return { ok: false, status: 403, reason: 'path escapes the project' }
  if (real.split(path.sep).includes('node_modules')) return { ok: false, status: 403, reason: 'node_modules is not allowed' }
  if (!ALLOWED_EXT.has(path.extname(real))) return { ok: false, status: 403, reason: 'file type is not allowed' }
  if (!statSync(real).isFile()) return { ok: false, status: 400, reason: 'not a file' }
  return { ok: true, file: real }
}

/** Opens a project file in the editor named by MOORP_EDITOR (default `code`). No shell: the path is one argv entry. */
export function openInEditor(root: string, file: unknown): Promise<{ opened: string }> {
  const r = resolveSourcePath(root, file)
  if (!r.ok) return Promise.reject(new HttpError(r.status, r.reason))
  const [cmd, ...args] = (process.env.MOORP_EDITOR ?? 'code').split(' ')
  return new Promise((resolve, reject) => {
    execFile(cmd!, [...args, r.file], (err) => (err ? reject(new HttpError(502, 'editor failed to start')) : resolve({ opened: path.relative(root, r.file) })))
  })
}
