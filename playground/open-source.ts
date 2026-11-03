import { execFile } from 'node:child_process'
import { realpathSync, statSync } from 'node:fs'
import path from 'node:path'
import type { Plugin } from 'vite'

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

/** Dev-server endpoint: POST /__moorp/open-source { file, line? } opens the file in the configured editor. */
export function openSourcePlugin(root: string): Plugin {
  return {
    name: 'moorp-open-source',
    configureServer(server) {
      server.middlewares.use('/__moorp/open-source', (req, res) => {
        const reply = (status: number, body: object) => ((res.statusCode = status), res.setHeader('Content-Type', 'application/json'), res.end(JSON.stringify(body)))
        if (req.method !== 'POST') return reply(405, { error: 'POST only' })
        // Any web page can send requests to localhost: require our own origin and a JSON body.
        const host = req.headers.host ?? ''
        const origin = req.headers.origin
        if (!origin || new URL(origin).host !== host) return reply(403, { error: 'cross-origin request refused' })
        if (!String(req.headers['content-type']).startsWith('application/json')) return reply(415, { error: 'JSON only' })
        let data = ''
        req.on('data', (c) => { data += c; if (data.length > 4096) req.destroy() })
        req.on('end', () => {
          let body: { file?: unknown }
          try { body = JSON.parse(data) } catch { return reply(400, { error: 'invalid JSON' }) }
          const r = resolveSourcePath(root, body.file)
          if (!r.ok) return reply(r.status, { error: r.reason })
          // No shell: the path is a single argv entry, never interpolated into a command line.
          const [cmd, ...args] = (process.env.MOORP_EDITOR ?? 'code').split(' ')
          execFile(cmd!, [...args, r.file], (err) => (err ? reply(502, { error: 'editor failed to start' }) : reply(200, { opened: path.relative(root, r.file) })))
        })
      })
    },
  }
}
