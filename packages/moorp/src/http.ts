import type { IncomingMessage, ServerResponse } from 'node:http'

export class HttpError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export function send(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

/** Mutating endpoints: any web page can send requests to localhost, so require our own origin... */
export function assertSameOrigin(req: IncomingMessage) {
  const origin = req.headers.origin
  let originHost: string | null = null
  try {
    originHost = origin ? new URL(origin).host : null
  } catch {
    originHost = null
  }
  if (!originHost || originHost !== req.headers.host) throw new HttpError(403, 'cross-origin request refused')
}

/** ...and, for requests with a body, a JSON content type (which a plain HTML form cannot send). */
export function assertSameOriginJson(req: IncomingMessage) {
  assertSameOrigin(req)
  if (!String(req.headers['content-type']).startsWith('application/json')) throw new HttpError(415, 'JSON only')
}

export function readJson(req: IncomingMessage, limit = 1_000_000): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let data = ''
    let size = 0
    req.on('data', (chunk: Buffer) => {
      size += chunk.length
      if (size > limit) {
        reject(new HttpError(413, 'body too large'))
        req.destroy()
        return
      }
      data += chunk
    })
    req.on('end', () => {
      try {
        resolve(JSON.parse(data || 'null'))
      } catch {
        reject(new HttpError(400, 'invalid JSON'))
      }
    })
    req.on('error', reject)
  })
}
