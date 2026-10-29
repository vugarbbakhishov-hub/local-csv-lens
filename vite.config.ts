import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  base: '/local-csv-lens/',
  assetsInclude: ['**/*.csv'],
  plugins: [react()],
  test: {
    // Node-based tests need a filesystem path for public URLs, including on Windows.
    alias: { '/samples': fileURLToPath(new URL('./public/samples', import.meta.url)) },
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
