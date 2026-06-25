import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, '../web/src'),
      '@jarvis/shared': resolve(__dirname, '../../packages/shared/src'),
    },
  },
  server: { port: 1420 },
  clearScreen: false,
  test: { passWithNoTests: true },
})
