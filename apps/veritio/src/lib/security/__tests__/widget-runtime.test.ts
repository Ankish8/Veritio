// @vitest-environment node

import { readFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../../..')

function read(relativePath: string) {
  return readFileSync(resolve(root, relativePath), 'utf8')
}

describe('widget and participant static security checks', () => {
  it('does not execute dynamic JavaScript in widget runtime artifacts', () => {
    for (const file of [
      'public/intercept-widget-v3.js',
      'public/intercept-widget-v3.min.js',
      'apps/veritio/src/lib/widget-templates/compiled.ts',
    ]) {
      const source = read(file)
      expect(source, file).not.toMatch(/\beval\s*\(/)
      expect(source, file).not.toMatch(/\bnew\s+Function\s*\(/)
    }
  })

  it('does not generate live website URLs with participant secrets', () => {
    for (const file of [
      'apps/veritio/src/components/players/live-website/live-website-player.tsx',
      'apps/veritio/src/components/players/live-website/recording-controller.tsx',
    ]) {
      const source = read(file)
      expect(source, file).not.toMatch(/searchParams\.set\(['"]__veritio_session['"]/)
      expect(source, file).not.toMatch(/searchParams\.set\(['"]__veritio_share['"]/)
    }
  })
})
