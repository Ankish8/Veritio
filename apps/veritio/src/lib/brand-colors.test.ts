import { describe, expect, it } from 'vitest'
import {
  BRAND_TEXT_DARK,
  BRAND_TEXT_LIGHT,
  generateBrandPalette,
  generateDarkBrandPalette,
  getBrandContrast,
  getContrastRatio,
  resolveBrandForeground,
} from './brand-colors'

const AA = 4.5

describe('getContrastRatio', () => {
  it('spans the WCAG range', () => {
    expect(getContrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1)
    expect(getContrastRatio('#2bbcca', '#2bbcca')).toBeCloseTo(1, 5)
  })

  it('is order independent', () => {
    expect(getContrastRatio('#2bbcca', '#ffffff')).toBeCloseTo(
      getContrastRatio('#ffffff', '#2bbcca'),
      5
    )
  })
})

describe('auto foreground', () => {
  // The previous luminance-cutoff rule favoured light text on these mid-tones and
  // landed under AA. Auto must pick the higher measured ratio instead.
  it.each([
    ['#EA580C', 'orange'],
    ['#16A34A', 'green'],
    ['#0D9488', 'teal'],
  ])('picks dark text on %s (%s) where light measures worse', (hex) => {
    expect(resolveBrandForeground(hex)).toBe(BRAND_TEXT_DARK)
    expect(getContrastRatio(hex, BRAND_TEXT_DARK)).toBeGreaterThanOrEqual(AA)
  })

  it.each(['#007A66', '#2563EB', '#7C3AED', '#DB2777', '#DC2626', '#1E293B', '#000000'])(
    'keeps light text on the dark preset %s',
    (hex) => {
      expect(resolveBrandForeground(hex)).toBe(BRAND_TEXT_LIGHT)
    }
  )

  it('always returns the higher-contrast candidate', () => {
    for (const hex of ['#2BBCCA', '#EA580C', '#16A34A', '#0D9488', '#FFFFFF', '#808080']) {
      const chosen = resolveBrandForeground(hex)
      const other = chosen === BRAND_TEXT_LIGHT ? BRAND_TEXT_DARK : BRAND_TEXT_LIGHT
      expect(getContrastRatio(hex, chosen)).toBeGreaterThanOrEqual(
        getContrastRatio(hex, other)
      )
    }
  })
})

describe('explicit text mode', () => {
  it('honours a light override that measures worse', () => {
    expect(resolveBrandForeground('#2BBCCA', 'light')).toBe(BRAND_TEXT_LIGHT)
    expect(resolveBrandForeground('#2BBCCA', 'auto')).toBe(BRAND_TEXT_DARK)
  })

  it('honours a dark override that measures worse', () => {
    expect(resolveBrandForeground('#2563EB', 'dark')).toBe(BRAND_TEXT_DARK)
    expect(resolveBrandForeground('#2563EB', 'auto')).toBe(BRAND_TEXT_LIGHT)
  })

  it('refuses an override that would render invisible text', () => {
    // Light text on a near-white brand is a rendering bug, not a style choice.
    expect(resolveBrandForeground('#FFFFFF', 'light')).toBe(BRAND_TEXT_DARK)
    expect(resolveBrandForeground('#000000', 'dark')).toBe(BRAND_TEXT_LIGHT)
  })

  it('flows through both palettes', () => {
    expect(generateBrandPalette('#2BBCCA', 'light').brandForeground).toBe(BRAND_TEXT_LIGHT)
    expect(generateBrandPalette('#2BBCCA', 'dark').brandForeground).toBe(BRAND_TEXT_DARK)
    expect(generateDarkBrandPalette('#2BBCCA', 'light').brandForeground).toBe(
      BRAND_TEXT_LIGHT
    )
  })

  it('defaults to auto when omitted', () => {
    expect(generateBrandPalette('#2BBCCA').brandForeground).toBe(
      generateBrandPalette('#2BBCCA', 'auto').brandForeground
    )
    expect(generateDarkBrandPalette('#EA580C').brandForeground).toBe(
      generateDarkBrandPalette('#EA580C', 'auto').brandForeground
    )
  })

  it('resolves against the white surface dark mode substitutes for near-black brands', () => {
    // Near-black and desaturated, so the dark palette paints white instead.
    const palette = generateDarkBrandPalette('#111111', 'light')
    expect(palette.brand).toBe('#ffffff')
    expect(palette.brandForeground).not.toBe(BRAND_TEXT_LIGHT)
  })
})

describe('getBrandContrast', () => {
  it('reports the failing ratio for a forced override', () => {
    const report = getBrandContrast('#2BBCCA', 'light')
    expect(report.foreground).toBe(BRAND_TEXT_LIGHT)
    expect(report.ratio).toBeLessThan(3)
    expect(report.level).toBe('fail')
    expect(report.overridden).toBe(false)
  })

  it('reports AAA for the auto pick on the same color', () => {
    const report = getBrandContrast('#2BBCCA', 'auto')
    expect(report.foreground).toBe(BRAND_TEXT_DARK)
    expect(report.ratio).toBeGreaterThan(7)
    expect(report.level).toBe('AAA')
  })

  it('grades the AA-large band', () => {
    // White on this teal measures 3.74:1: fine for large text, under AA for body.
    const report = getBrandContrast('#0D9488', 'light')
    expect(report.ratio).toBeGreaterThanOrEqual(3)
    expect(report.ratio).toBeLessThan(AA)
    expect(report.level).toBe('AA-large')
  })

  it('flags when the invisibility floor overrode the choice', () => {
    expect(getBrandContrast('#FFFFFF', 'light').overridden).toBe(true)
    expect(getBrandContrast('#FFFFFF', 'dark').overridden).toBe(false)
  })

  it('accepts hex without a leading hash', () => {
    expect(getBrandContrast('2BBCCA').foreground).toBe(
      getBrandContrast('#2BBCCA').foreground
    )
  })
})
