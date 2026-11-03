import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'

// Spike-only dev middleware: a page that refuses embedding, and a header check for Page Frame URLs.
function moorpDev(): Plugin {
  return {
    name: 'moorp-dev',
    configureServer(server) {
      server.middlewares.use('/blocked', (_req, res) => {
        res.setHeader('X-Frame-Options', 'DENY')
        res.setHeader('Content-Type', 'text/html')
        res.end('<h1>This page refuses to be framed</h1>')
      })
      server.middlewares.use('/__moorp/frame-check', async (req, res) => {
        const raw = new URL((req as { url?: string }).url ?? '', 'http://x').searchParams.get('url') ?? ''
        res.setHeader('Content-Type', 'application/json')
        try {
          const target = new URL(raw, 'http://localhost:5173')
          if (!['http:', 'https:'].includes(target.protocol)) throw new Error('only http(s) URLs')
          const r = await fetch(target, { method: 'GET', redirect: 'follow' })
          const xfo = r.headers.get('x-frame-options') ?? ''
          const fa = /frame-ancestors\s+([^;]+)/i.exec(r.headers.get('content-security-policy') ?? '')?.[1]?.trim()
          const sameOrigin = target.origin === 'http://localhost:5173'
          // DENY blocks everyone; SAMEORIGIN and a restrictive frame-ancestors block cross-origin embedders.
          const denied = /deny/i.test(xfo) || (!sameOrigin && (/sameorigin/i.test(xfo) || (fa !== undefined && !/\*/.test(fa))))
          const reason = xfo ? `X-Frame-Options: ${xfo}` : fa ? `CSP frame-ancestors ${fa}` : ''
          res.end(JSON.stringify({ embeddable: !denied, reason: denied ? reason : '' }))
        } catch (e) {
          res.end(JSON.stringify({ embeddable: false, reason: e instanceof Error ? e.message : String(e) }))
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [vue(), moorpDev()],
  build: { rollupOptions: { input: { index: 'index.html', preview: 'preview.html', demo: 'demo.html' } } },
})
