import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  build: { rollupOptions: { input: { index: 'index.html', preview: 'preview.html' } } },
})
