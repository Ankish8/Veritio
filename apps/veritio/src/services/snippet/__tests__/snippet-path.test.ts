import { describe, expect, it } from 'vitest'
import { normalizeSnippetFile } from '../snippet-path'

describe('normalizeSnippetFile', () => {
  it('removes the JavaScript suffix from public snippet URLs', () => {
    expect(normalizeSnippetFile('2ab183d8-62d.js')).toBe('2ab183d8-62d')
  })

  it('keeps suffix-free IDs unchanged', () => {
    expect(normalizeSnippetFile('2ab183d8-62d')).toBe('2ab183d8-62d')
  })
})
