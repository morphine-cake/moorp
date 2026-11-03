import type { App } from 'vue'
import { createRouter, createMemoryHistory } from 'vue-router'
import '../src/global.css'

// Provider context every Design Frame gets (router, theme CSS, ...).
export function setup(app: App) {
  app.use(createRouter({ history: createMemoryHistory(), routes: [{ path: '/', component: { render: () => null } }] }))
}
