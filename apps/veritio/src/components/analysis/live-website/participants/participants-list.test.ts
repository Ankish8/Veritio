import { describe, it, expect } from 'vitest'
import { buildColumnGeometry } from './participants-list'

// Cells rendered per row, excluding the checkbox the list base supplies:
// Participant, Status, [Variant], Date, Device, Time, Tasks, [Verified],
// Pages Visited, Clicks, Scroll Depth
const renderedCellCount = (hasVariant: boolean, hasVerified: boolean) =>
  9 + (hasVariant ? 1 : 0) + (hasVerified ? 1 : 0)

const combinations = [
  { hasVariant: false, hasVerified: false },
  { hasVariant: false, hasVerified: true },
  { hasVariant: true, hasVerified: false },
  { hasVariant: true, hasVerified: true },
]

describe('buildColumnGeometry', () => {
  it.each(combinations)(
    'keeps all three arrays aligned with the rendered cells (variant=$hasVariant, verified=$hasVerified)',
    ({ hasVariant, hasVerified }) => {
      const { columnWidths, columnMinWidths, columnVisibleFrom } = buildColumnGeometry({ hasVariant, hasVerified })

      // +1 for the checkbox column the list base renders itself
      const expected = renderedCellCount(hasVariant, hasVerified) + 1

      expect(columnWidths).toHaveLength(expected)
      expect(columnMinWidths).toHaveLength(expected)
      expect(columnVisibleFrom).toHaveLength(expected)
    }
  )

  it.each(combinations)(
    'widths still total 100% (variant=$hasVariant, verified=$hasVerified)',
    ({ hasVariant, hasVerified }) => {
      const { columnWidths } = buildColumnGeometry({ hasVariant, hasVerified })
      const total = columnWidths.reduce((sum, w) => sum + parseFloat(w), 0)

      expect(total).toBeGreaterThan(99.9)
      expect(total).toBeLessThan(100.1)
    }
  )

  it('drops the Verified column rather than blanking it, so later columns shift left', () => {
    const withVerified = buildColumnGeometry({ hasVariant: false, hasVerified: true })
    const without = buildColumnGeometry({ hasVariant: false, hasVerified: false })

    // Verified sits at index 7 (checkbox, Participant, Status, Date, Device, Time, Tasks)
    // and Pages Visited follows it. Dropping Verified must pull Pages Visited into its slot.
    expect(withVerified.columnMinWidths[7]).toBe(137)
    expect(withVerified.columnMinWidths[8]).toBe(126)
    expect(without.columnMinWidths[7]).toBe(126)
  })

  it('accounts for the variant column shifting Verified one slot right', () => {
    const withVariant = buildColumnGeometry({ hasVariant: true, hasVerified: false })
    const bothOn = buildColumnGeometry({ hasVariant: true, hasVerified: true })

    expect(bothOn.columnMinWidths[8]).toBe(137)
    // With Verified dropped, Pages Visited (126) takes index 8
    expect(withVariant.columnMinWidths[8]).toBe(126)
  })
})
