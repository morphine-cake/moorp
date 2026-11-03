import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'

// A page that refuses to be framed, for trying the "cannot embed" message on a Page Frame.
function blockedPage(): Plugin {
  return {
    name: 'playground-blocked-page',
    configureServer(server) {
      server.middlewares.use('/blocked', (_req, res) => {
        res.setHeader('X-Frame-Options', 'DENY')
        res.setHeader('Content-Type', 'text/html')
        res.end('<h1>This page refuses to be framed</h1>')
      })
    },
  }
}

export default defineConfig({
  plugins: [vue(), blockedPage()],
})
