import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: { host: true, port: 5273 },
  build: {
    target: 'es2022',
    // No manualChunks: Vite 8 bundles with rolldown, which only accepts the
    // function form. Its default chunking is fine here anyway — this is one
    // page, and splitting three away from r3f buys nothing.
    chunkSizeWarningLimit: 1400,
  },
})
