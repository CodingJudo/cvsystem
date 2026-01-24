import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  test: {
    // Use node for pure logic tests, jsdom for React component tests
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.{ts,tsx}'],
    // Use jsdom only for React component tests
    environmentMatchGlobs: [
      ['src/**/*.test.tsx', 'jsdom'],
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
})
