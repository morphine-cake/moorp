import { existsSync } from 'node:fs'
import type { ServerResponse } from 'node:http'
import { createRequire } from 'node:module'
import path from 'node:path'
import type { Plugin } from 'vite'
import { createCanvasStore } from './canvas-store.ts'
import { checkFrame } from './frame-check.ts'
import { HttpError, assertSameOrigin, assertSameOriginJson, readJson, send } from './http.ts'
import { openInEditor } from './open-source.ts'
import { serveStatic } from './static.ts'

export type MoorpOptions = {
  /** Framework adapter package that provides `startPreview`. */
  adapter?: string
}

const PREVIEW_ID = 'virtual:moorp-preview'
const PREVIEW_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Moorp preview</title>
    <style>body { margin: 0 }</style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/@id/__x00__${PREVIEW_ID}"></script>
  </body>
</html>
`

function shellDir(): string | null {
  try {
    const pkg = createRequire(import.meta.url).resolve('@moorp/shell/package.json')
    const dist = path.join(path.dirname(pkg), 'dist')
    return existsSync(path.join(dist, 'index.html')) ? dist : null
  } catch {
    return null
  }
}

/** Vite plugin: serves the Moorp shell at /__moorp/, the canvas API, and the per-frame preview entry. */
export function moorp(options: MoorpOptions = {}): Plugin {
  const adapter = options.adapter ?? '@moorp/vue'
  let root = process.cwd()
  const previewSetup = () => ['preview.ts', 'preview.js'].map((f) => path.join(root, '.visual-canvas', f)).find((f) => existsSync(f))

  return {
    name: 'moorp',
    apply: 'serve',
    configResolved(config) {
      root = config.root
    },
    resolveId(id) {
      if (id === PREVIEW_ID) return '\0' + PREVIEW_ID
    },
    load(id) {
      if (id !== '\0' + PREVIEW_ID) return
      const setup = previewSetup()
      return `import { startPreview } from ${JSON.stringify(adapter)}
${setup ? `import { setup } from ${JSON.stringify('/' + path.relative(root, setup).split(path.sep).join('/'))}` : 'const setup = undefined'}

startPreview({
  root: document.getElementById('root'),
  setup,
  async load(file, exportName = 'default') {
    // Dev-server URL import: no glob, so adding a component file does not invalidate this module.
    const mod = await import(/* @vite-ignore */ '/' + file)
    const component = mod[exportName]
    if (!component) throw new Error(file + ' has no export "' + exportName + '"')
    return component
  },
})
`
    },
    configureServer(server) {
      const store = createCanvasStore(root)
      const sse = new Set<ServerResponse>()

      server.watcher.add(store.dir)
      const changed = (file: string) => {
        const p = store.pathOf(file)
        if (p) for (const c of sse) c.write(`data: ${JSON.stringify({ type: 'canvas', path: p })}\n\n`)
      }
      server.watcher.on('add', changed).on('change', changed).on('unlink', changed)
      const heartbeat = setInterval(() => sse.forEach((c) => c.write(': keep-alive\n\n')), 25_000)
      heartbeat.unref()
      server.httpServer?.on('close', () => clearInterval(heartbeat))

      server.middlewares.use('/__moorp', async (req, res, next) => {
        const url = new URL(req.url ?? '/', 'http://x')
        const route = url.pathname
        try {
          if (route.startsWith('/api/')) return await api(route, url, req, res)
          if (route === '/preview.html') {
            res.setHeader('Content-Type', 'text/html; charset=utf-8')
            return void res.end(await server.transformIndexHtml('/__moorp/preview.html', PREVIEW_HTML))
          }
          const dist = shellDir()
          if (!dist) return void send(res, 503, { error: 'The Moorp shell is not built. Run `pnpm build` in the moorp repository.' })
          if (!serveStatic(dist, route, req, res)) next()
        } catch (e) {
          if (e instanceof HttpError) return void send(res, e.status, { error: e.message })
          console.error('[moorp]', e)
          send(res, 500, { error: 'internal error' })
        }
      })

      async function api(route: string, url: URL, req: import('node:http').IncomingMessage, res: ServerResponse) {
        const method = req.method ?? 'GET'
        const p = url.searchParams.get('path')
        if (route === '/api/info' && method === 'GET') return send(res, 200, { root: path.basename(root), adapter, hasPreviewSetup: !!previewSetup() })
        if (route === '/api/canvases' && method === 'GET') return send(res, 200, { canvases: store.list() })
        if (route === '/api/frame-check' && method === 'GET') {
          const ownOrigin = `http://${req.headers.host}`
          return send(res, 200, await checkFrame(url.searchParams.get('url') ?? '', ownOrigin))
        }
        if (route === '/api/events' && method === 'GET') {
          res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' })
          res.write(': connected\n\n')
          sse.add(res)
          req.on('close', () => sse.delete(res))
          return
        }
        if (route === '/api/canvas') {
          if (method === 'GET') return send(res, 200, store.read(p as string))
          if (method === 'DELETE') return (assertSameOrigin(req), store.remove(p as string), send(res, 200, { ok: true }))
          if (method === 'PUT' || method === 'POST') {
            assertSameOriginJson(req)
            if (method === 'PUT') store.write(p as string, await readJson(req))
            else store.create(p as string)
            return send(res, 200, { ok: true })
          }
        }
        if (route === '/api/canvas/rename' && method === 'POST') {
          assertSameOriginJson(req)
          const body = (await readJson(req)) as { from?: string; to?: string } | null
          store.rename(body?.from as string, body?.to as string)
          return send(res, 200, { ok: true })
        }
        if (route === '/api/open-source' && method === 'POST') {
          assertSameOriginJson(req)
          const body = (await readJson(req)) as { file?: unknown } | null
          return send(res, 200, await openInEditor(root, body?.file))
        }
        throw new HttpError(route.startsWith('/api/') ? 404 : 405, 'not found')
      }
    },
  }
}

