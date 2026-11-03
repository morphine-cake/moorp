import { createReadStream, statSync } from 'node:fs'
import type { IncomingMessage, ServerResponse } from 'node:http'
import path from 'node:path'

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
}

/** Serves files from one directory (the built shell). Anything that resolves outside it is a 404. Returns false when nothing matched. */
export function serveStatic(dir: string, urlPath: string, req: IncomingMessage, res: ServerResponse): boolean {
  if (req.method !== 'GET' && req.method !== 'HEAD') return false
  let rel: string
  try {
    rel = decodeURIComponent(urlPath.split('?')[0]!)
  } catch {
    return false
  }
  if (rel === '' || rel.endsWith('/')) rel += 'index.html'
  const file = path.resolve(dir, '.' + path.sep + rel)
  if (!file.startsWith(dir + path.sep)) return false
  try {
    if (!statSync(file).isFile()) return false
  } catch {
    return false
  }
  res.statusCode = 200
  res.setHeader('Content-Type', TYPES[path.extname(file)] ?? 'application/octet-stream')
  if (req.method === 'HEAD') return void res.end(), true
  createReadStream(file).pipe(res)
  return true
}
