/**
 * Production backend bundle — replaces `motia-iii build`.
 *
 * Regenerates the step index, then esbuild-bundles src/backend/main.ts into
 * dist/backend.mjs (single file, sourcemapped). Settings mirror motia's own
 * production build: bundle, node platform, esm, external ws (native addon
 * chain stays in node_modules — present in the Docker image).
 *
 * Usage: bun scripts/build-backend.ts   (or: bun run build:backend)
 */

import { spawnSync } from 'node:child_process'
import path from 'node:path'
import * as esbuild from 'esbuild'

const APP_DIR = path.resolve(import.meta.dir, '..')

const gen = spawnSync('bun', [path.join(APP_DIR, 'scripts', 'generate-step-index.ts')], {
  cwd: APP_DIR,
  stdio: 'inherit',
})
if (gen.status !== 0) {
  console.error('[build-backend] step index generation failed')
  process.exit(gen.status ?? 1)
}

const started = Date.now()
try {
  const result = await esbuild.build({
    entryPoints: [path.join(APP_DIR, 'src', 'backend', 'main.ts')],
    outfile: path.join(APP_DIR, 'dist', 'backend.mjs'),
    bundle: true,
    platform: 'node',
    target: ['node22'],
    format: 'esm',
    minify: true,
    sourcemap: true,
    external: ['ws'],
    logLevel: 'warning',
    // package.json "type": "module" + esm output; tsconfig paths (@/*)
    // resolve natively via esbuild's tsconfig support.
    tsconfig: path.join(APP_DIR, 'tsconfig.json'),
  })
  if (result.errors.length > 0) process.exit(1)
  console.log(`[build-backend] dist/backend.mjs built in ${Date.now() - started}ms`)
} catch {
  process.exit(1)
}
