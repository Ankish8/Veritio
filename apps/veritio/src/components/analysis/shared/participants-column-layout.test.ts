import { afterEach, describe, expect, it, vi } from 'vitest'

import { assertValidColumnWidths } from '@veritio/analysis-shared'
import { calculateColumnWidths, COLUMN_DEFINITIONS } from '../first-impression/participants/column-definitions'
import type { FirstImpressionColumnId } from '../first-impression/participants/column-definitions'

/**
 * Participant tables lay their columns out with percentage CSS Grid tracks.
 * A percentage track never grows to fit its content, so if the percentages do
 * not describe the rendered columns exactly, the trailing columns get pushed
 * past the container and header labels paint on top of each other.
 * These tests pin that invariant.
 */
describe('participant table column layout', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('accepts a well-formed layout', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(assertValidColumnWidths(['5%', '65%', '30%'], [40, 200, 100])).toEqual([])
    expect(spy).not.toHaveBeenCalled()
  })

  it('rejects percentages that overflow the container', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    // The live website table shipped this shape: 102% total, so the last
    // columns rendered outside the table and overlapped their neighbours.
    const problems = assertValidColumnWidths([
      '3%', '14%', '9%', '8%', '8%', '8%', '8%', '10%', '10%', '9%', '8%', '7%',
    ])

    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain('102.0%')
  })

  it('rejects percentages that under-fill the container', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(assertValidColumnWidths(['5%', '60%', '30%'])).toHaveLength(1)
  })

  it('rejects a minimum-width array that does not pair with the columns', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const problems = assertValidColumnWidths(['50%', '50%'], [100])

    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain('columnMinWidths has 1 entries')
  })

  it('ignores non-percentage tracks', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(assertValidColumnWidths(['40px', '1fr', 'auto'])).toEqual([])
    expect(spy).not.toHaveBeenCalled()
  })

  it('first impression widths fill the row exactly alongside the checkbox track', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const allColumns = new Set(COLUMN_DEFINITIONS.map((c) => c.id)) as Set<FirstImpressionColumnId>

    for (const visible of [allColumns, new Set<FirstImpressionColumnId>(['participant', 'status'])]) {
      const widthMap = calculateColumnWidths(visible)
      const widths = [
        '5%', // checkbox track prepended by the participants list
        ...[...visible].map((id) => widthMap.get(id)!),
      ]

      expect(assertValidColumnWidths(widths)).toEqual([])
    }

    expect(spy).not.toHaveBeenCalled()
  })
})
