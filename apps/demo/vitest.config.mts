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
      '@cvsystem/core': resolve(__dirname, '../../packages/core/src/index.ts'),
      '@cvsystem/adapters-browser': resolve(__dirname, '../../packages/adapters-browser/src/index.ts'),
      '@geisli/brand': resolve(__dirname, '../../brands/geisli/src/index.ts'),
    },
  },
  test: {
    // node for pure logic tests; component tests (.test.tsx) use // @vitest-environment jsdom
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
})
