import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

// Served by the moorp CLI under /__moorp/, so all asset URLs are rooted there.
export default defineConfig({
  base: '/__moorp/',
  plugins: [vue(), tailwindcss()],
  // `@/` points at src/, as in the codeva design system, so its components paste in with the same imports.
  resolve: { alias: { '@': decodeURIComponent(new URL('./src', import.meta.url).pathname) } },
  build: { outDir: 'dist', emptyOutDir: true },
})
