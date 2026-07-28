/**
 * Brand Color Palette Generator
 *
 * Generates a complete color palette from a single hex color,
 * with tints and shades for different visual hierarchy levels.
 */

export interface BrandPalette {
  brand: string // Original color (100%)
  brandHover: string // Darker variant for hover states
  brandMuted: string // 50% opacity for focus rings
  brandLight: string // 15% opacity for selection backgrounds
  brandSubtle: string // 5% opacity for ultra-light accents
  brandForeground: string // White or dark text based on contrast
}

/**
 * How the text/icon color on top of the brand color is chosen.
 * - 'auto': pick whichever candidate measures higher contrast (default)
 * - 'light': force light text, even when it measures worse
 * - 'dark': force dark text, even when it measures worse
 */
export type BrandTextMode = 'auto' | 'light' | 'dark'

/** The two candidate foreground colors used on brand surfaces. */
export const BRAND_TEXT_LIGHT = '#ffffff'
export const BRAND_TEXT_DARK = '#1a1a1a'

/**
 * Convert hex color to RGB components
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  // Remove # if present and normalize to 6 characters
  const cleanHex = hex.replace('#', '')
  const fullHex =
    cleanHex.length === 3
      ? cleanHex
          .split('')
          .map((c) => c + c)
          .join('')
      : cleanHex

  return {
    r: parseInt(fullHex.slice(0, 2), 16),
    g: parseInt(fullHex.slice(2, 4), 16),
    b: parseInt(fullHex.slice(4, 6), 16),
  }
}

/**
 * Convert RGB to HSL for easier manipulation
 */
function rgbToHsl(
  r: number,
  g: number,
  b: number
): { h: number; s: number; l: number } {
  r /= 255
  g /= 255
  b /= 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2

  let h = 0
  let s = 0

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6
        break
      case g:
        h = ((b - r) / d + 2) / 6
        break
      case b:
        h = ((r - g) / d + 4) / 6
        break
    }
  }

  return { h, s, l }
}

/**
 * Convert HSL back to hex
 */
function hslToHex(h: number, s: number, l: number): string {
  let r: number, g: number, b: number

  if (s === 0) {
    r = g = b = l
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1
      if (t > 1) t -= 1
      if (t < 1 / 6) return p + (q - p) * 6 * t
      if (t < 1 / 2) return q
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
      return p
    }

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hue2rgb(p, q, h + 1 / 3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1 / 3)
  }

  const toHex = (n: number) => {
    const hex = Math.round(n * 255).toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

/**
 * Calculate relative luminance for contrast checking
 * Based on WCAG 2.0 formula
 */
function getLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex)

  // Convert to linear RGB
  const toLinear = (c: number) => {
    c = c / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  }

  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)
}

/**
 * WCAG 2.1 contrast ratio between two colors, from 1 (identical) to 21 (black on white).
 * AA requires 4.5 for body text and 3 for large text / UI components.
 */
export function getContrastRatio(hexA: string, hexB: string): number {
  const [lighter, darker] = [getLuminance(hexA), getLuminance(hexB)].sort(
    (a, b) => b - a
  )
  return (lighter + 0.05) / (darker + 0.05)
}

/**
 * Determine optimal foreground color (white or dark) for text on this background.
 *
 * Picks whichever candidate measures higher contrast. A previous version used a
 * hand-tuned luminance cutoff (0.35) that favoured white on mid-tone colors, which
 * put orange, green and teal brand colors below AA (white measured 3.3-3.7:1 where
 * dark measured 4.6-5.3:1).
 */
function getContrastingForeground(hex: string): string {
  return getContrastRatio(hex, BRAND_TEXT_DARK) >=
    getContrastRatio(hex, BRAND_TEXT_LIGHT)
    ? BRAND_TEXT_DARK
    : BRAND_TEXT_LIGHT
}

/**
 * Minimum contrast a forced foreground must keep against the brand surface.
 * Below this the text is effectively invisible (e.g. forcing light text onto the
 * white brand color that dark mode substitutes for near-black brands), which is a
 * rendering bug rather than a style choice, so we fall back to the auto pick.
 */
const FORCED_FOREGROUND_FLOOR = 1.5

/**
 * Resolve the foreground for a brand surface, honouring an explicit author choice.
 * `hex` must be the color actually rendered, not the authored brand color, since the
 * dark palette adjusts lightness before painting.
 */
export function resolveBrandForeground(
  hex: string,
  textMode: BrandTextMode = 'auto'
): string {
  if (textMode === 'auto') return getContrastingForeground(hex)

  const forced = textMode === 'light' ? BRAND_TEXT_LIGHT : BRAND_TEXT_DARK
  return getContrastRatio(hex, forced) >= FORCED_FOREGROUND_FLOOR
    ? forced
    : getContrastingForeground(hex)
}

export interface BrandContrastReport {
  /** The foreground that will actually be rendered. */
  foreground: string
  /** Measured contrast ratio of that foreground against the brand surface. */
  ratio: number
  /** WCAG conformance of the measured ratio for body text. */
  level: 'AAA' | 'AA' | 'AA-large' | 'fail'
  /** True when an explicit choice was overridden by the invisibility floor. */
  overridden: boolean
}

/**
 * Report the contrast the participant will actually see, for surfacing in the builder.
 */
export function getBrandContrast(
  hex: string,
  textMode: BrandTextMode = 'auto'
): BrandContrastReport {
  const normalized = hex.startsWith('#') ? hex : `#${hex}`
  const foreground = resolveBrandForeground(normalized, textMode)
  const ratio = getContrastRatio(normalized, foreground)
  const level =
    ratio >= 7 ? 'AAA' : ratio >= 4.5 ? 'AA' : ratio >= 3 ? 'AA-large' : 'fail'

  return {
    foreground,
    ratio,
    level,
    overridden:
      textMode !== 'auto' &&
      foreground !== (textMode === 'light' ? BRAND_TEXT_LIGHT : BRAND_TEXT_DARK),
  }
}

/**
 * Generate a complete brand color palette from a single hex color
 */
export function generateBrandPalette(
  baseHex: string,
  textMode: BrandTextMode = 'auto'
): BrandPalette {
  // Normalize hex
  const hex = baseHex.startsWith('#') ? baseHex : `#${baseHex}`
  const { r, g, b } = hexToRgb(hex)
  const { h, s, l } = rgbToHsl(r, g, b)

  // Generate hover variant (8% darker, with minimum darkness)
  const hoverL = Math.max(0.08, l - 0.08)
  const hoverHex = hslToHex(h, s, hoverL)

  return {
    brand: hex,
    brandHover: hoverHex,
    brandMuted: `rgba(${r}, ${g}, ${b}, 0.5)`,
    brandLight: `rgba(${r}, ${g}, ${b}, 0.15)`,
    brandSubtle: `rgba(${r}, ${g}, ${b}, 0.05)`,
    brandForeground: resolveBrandForeground(hex, textMode),
  }
}

/**
 * Generate a dark-mode-optimized brand color palette.
 * Adjusts colors for better visibility on dark backgrounds.
 *
 * Key differences from light mode:
 * - Ensures brand color has minimum 55% lightness for visibility
 * - For very dark/desaturated colors (black, dark gray), uses white instead
 * - Hover state lightens instead of darkens
 * - Higher opacity for muted variants (better visibility on dark)
 */
export function generateDarkBrandPalette(
  baseHex: string,
  textMode: BrandTextMode = 'auto'
): BrandPalette {
  // Normalize hex
  const hex = baseHex.startsWith('#') ? baseHex : `#${baseHex}`
  const { r, g, b } = hexToRgb(hex)
  const { h, s, l } = rgbToHsl(r, g, b)

  // For very dark colors with low saturation (black, dark grays), use white
  // This prevents the "disabled button" look
  const isVeryDarkAndDesaturated = l < 0.15 && s < 0.3

  if (isVeryDarkAndDesaturated) {
    // Use white as the brand color for dark mode
    return {
      brand: '#ffffff',
      brandHover: '#e5e5e5',
      brandMuted: 'rgba(255, 255, 255, 0.5)',
      brandLight: 'rgba(255, 255, 255, 0.20)',
      brandSubtle: 'rgba(255, 255, 255, 0.10)',
      // Resolved against the substituted white surface, so a forced light text mode
      // falls back to dark rather than rendering white on white.
      brandForeground: resolveBrandForeground('#ffffff', textMode),
    }
  }

  // For dark mode, ensure brand color is light enough (minimum 55% lightness)
  const minLightness = 0.55
  const needsAdjustment = l < minLightness

  // Adjust lightness while preserving hue and saturation
  const adjustedL = needsAdjustment ? minLightness : l
  const adjustedHex = needsAdjustment ? hslToHex(h, s, adjustedL) : hex
  const adjustedRgb = needsAdjustment ? hexToRgb(adjustedHex) : { r, g, b }

  // In dark mode, hover should be lighter (opposite of light mode)
  const hoverL = Math.min(0.85, adjustedL + 0.1)
  const hoverHex = hslToHex(h, s, hoverL)

  return {
    brand: adjustedHex,
    brandHover: hoverHex,
    // Higher opacity values for better visibility on dark backgrounds
    brandMuted: `rgba(${adjustedRgb.r}, ${adjustedRgb.g}, ${adjustedRgb.b}, 0.5)`,
    brandLight: `rgba(${adjustedRgb.r}, ${adjustedRgb.g}, ${adjustedRgb.b}, 0.20)`,
    brandSubtle: `rgba(${adjustedRgb.r}, ${adjustedRgb.g}, ${adjustedRgb.b}, 0.10)`,
    brandForeground: resolveBrandForeground(adjustedHex, textMode),
  }
}
