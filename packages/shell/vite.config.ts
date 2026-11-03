import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// Served by the moorp CLI under /__moorp/, so all asset URLs are rooted there.
export default defineConfig({
  base: '/__moorp/',
  plugins: [vue()],
  build: { outDir: 'dist', emptyOutDir: true },
})
