import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // API route handlers only: no DOM needed.
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
