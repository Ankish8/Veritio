import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'node:url';
const dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

// Optional Storybook browser testing (requires @storybook/addon-vitest and @vitest/browser-playwright)
let storybookProject: any = null;
try {
  const { storybookTest } = await import('@storybook/addon-vitest/vitest-plugin');
  const { playwright } = await import('@vitest/browser-playwright');
  storybookProject = {
    extends: true,
    plugins: [
      storybookTest({
        configDir: path.join(dirname, '.storybook')
      })
    ],
    test: {
      name: 'storybook',
      browser: {
        enabled: true,
        headless: true,
        provider: playwright({}),
        instances: [{
          browser: 'chromium'
        }]
      },
      setupFiles: ['.storybook/vitest.setup.ts']
    }
  };
} catch {
  // Storybook browser testing dependencies not installed - skip
}

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      exclude: ['node_modules/', 'dist/', '.next/', 'coverage/', '**/*.config.ts', '**/types.d.ts', '**/*.test.ts', '**/*.test.tsx']
    },
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    exclude: ['node_modules', 'dist', '.next'],
    ...(storybookProject ? { projects: [storybookProject] } : {})
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});