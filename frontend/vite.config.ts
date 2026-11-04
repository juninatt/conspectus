import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  server: {
    // The frontend calls /api/…; in development these requests are forwarded
    // to the backend, so the browser sees a single origin and no CORS setup
    // is needed.
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  test: {
    environment: 'jsdom',
    // Generous, so the first test in a file passes on a busy machine too.
    testTimeout: 15_000,
    setupFiles: ['./src/test/setup.ts'],
  },
})
