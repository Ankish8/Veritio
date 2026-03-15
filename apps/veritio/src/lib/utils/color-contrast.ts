/**
 * Color Contrast Utilities
 *
 * Implements WCAG 2.1 color contrast calculations for accessibility compliance.
 * Used by the intercept widget to ensure text is readable against backgrounds.
 *
 * WCAG Standards:
 * - AA (minimum): 4.5:1 for normal text, 3:1 for large text (18pt+ or 14pt+ bold)
 * - AAA (enhanced): 7:1 for normal text, 4.5:1 for large text
 *
 * References:
 * - https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html
 * - https://www.w3.org/WAI/WCAG21/Understanding/contrast-enhanced.html
 */

/**
 * Convert hex color to RGB values
 * @param hex - Hex color string (e.g., "#ffffff" or "ffffff")
 * @returns RGB values [r, g, b] in range 0-255
 */
export function hexToRgb(hex: string): [number, number, number] {
  // Remove # if present
  const cleanHex = hex.replace(/^#/, '')

  // Validate hex format
  if (!/^[0-9A-Fa-f]{6}$/.test(cleanHex)) {
    // Invalid hex color — default to black
    return [0, 0, 0]
  }

  const r = parseInt(cleanHex.slice(0, 2), 16)
  const g = parseInt(cleanHex.slice(2, 4), 16)
  const b = parseInt(cleanHex.slice(4, 6), 16)

  return [r, g, b]
}

/**
 * Convert RGB values to hex color
 * @param r - Red value (0-255)
 * @param g - Green value (0-255)
 * @param b - Blue value (0-255)
 * @returns Hex color string with # prefix
 */
export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => {
    const clamped = Math.max(0, Math.min(255, Math.round(n)))
    return clamped.toString(16).padStart(2, '0')
  }

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

/**
 * Calculate relative luminance of a color per WCAG formula
 * @param hex - Hex color string
 * @returns Relative luminance (0-1)
 */
export function getRelativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex)

  // Convert to sRGB
  const toLinear = (channel: number): number => {
    const val = channel / 255
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4)
  }

  const rLinear = toLinear(r)
  const gLinear = toLinear(g)
  const bLinear = toLinear(b)

  // Calculate luminance using WCAG coefficients
  return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear
}

/**
 * Calculate contrast ratio between two colors per WCAG formula
 * @param color1 - First hex color
 * @param color2 - Second hex color
 * @returns Contrast ratio (1-21)
 */
export function calculateContrastRatio(color1: string, color2: string): number {
  const l1 = getRelativeLuminance(color1)
  const l2 = getRelativeLuminance(color2)

  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)

  return (lighter + 0.05) / (darker + 0.05)
}

/**
 * WCAG compliance level
 */
export type WCAGLevel = 'AAA' | 'AA' | 'Fail'

/**
 * Get WCAG compliance level for a contrast ratio
 * @param ratio - Contrast ratio
 * @param largeText - Whether text is large (18pt+ or 14pt+ bold)
 * @returns WCAG level
 */
export function getWCAGLevel(ratio: number, largeText = false): WCAGLevel {
  if (largeText) {
    if (ratio >= 4.5) return 'AAA'
    if (ratio >= 3) return 'AA'
  } else {
    if (ratio >= 7) return 'AAA'
    if (ratio >= 4.5) return 'AA'
  }
  return 'Fail'
}

/**
 * Check if contrast meets WCAG AA minimum standard
 * @param bgColor - Background hex color
 * @param textColor - Text hex color
 * @param largeText - Whether text is large (18pt+ or 14pt+ bold)
 * @returns Whether contrast meets AA standard
 */
export function meetsWCAG_AA(
  bgColor: string,
  textColor: string,
  largeText = false
): boolean {
  const ratio = calculateContrastRatio(bgColor, textColor)
  return largeText ? ratio >= 3 : ratio >= 4.5
}

/**
 * Check if contrast meets WCAG AAA enhanced standard
 * @param bgColor - Background hex color
 * @param textColor - Text hex color
 * @param largeText - Whether text is large (18pt+ or 14pt+ bold)
 * @returns Whether contrast meets AAA standard
 */
export function meetsWCAG_AAA(
  bgColor: string,
  textColor: string,
  largeText = false
): boolean {
  const ratio = calculateContrastRatio(bgColor, textColor)
  return largeText ? ratio >= 4.5 : ratio >= 7
}

/**
 * Get optimal text color (black or white) for a given background
 * Uses contrast ratio to determine which provides better readability
 * @param bgColor - Background hex color
 * @returns '#000000' or '#ffffff'
 */
export function getContrastingTextColor(bgColor: string): '#000000' | '#ffffff' {
  const whiteRatio = calculateContrastRatio(bgColor, '#ffffff')
  const blackRatio = calculateContrastRatio(bgColor, '#000000')

  return whiteRatio > blackRatio ? '#ffffff' : '#000000'
}

/**
 * Get a readable color palette recommendation
 * @param baseColor - Base hex color
 * @returns Recommended text and background colors with contrast ratios
 */
export function getAccessiblePalette(baseColor: string) {
  const whiteContrast = calculateContrastRatio(baseColor, '#ffffff')
  const blackContrast = calculateContrastRatio(baseColor, '#000000')

  // Determine if base color is light or dark
  const luminance = getRelativeLuminance(baseColor)
  const isLight = luminance > 0.5

  return {
    baseColor,
    isLight,
    onBaseColor: getContrastingTextColor(baseColor),
    whiteContrast: {
      ratio: whiteContrast,
      level: getWCAGLevel(whiteContrast),
      meetsAA: whiteContrast >= 4.5,
      meetsAAA: whiteContrast >= 7,
    },
    blackContrast: {
      ratio: blackContrast,
      level: getWCAGLevel(blackContrast),
      meetsAA: blackContrast >= 4.5,
      meetsAAA: blackContrast >= 7,
    },
  }
}

/**
 * Validate a color pair for accessibility
 * @param bgColor - Background hex color
 * @param textColor - Text hex color
 * @param largeText - Whether text is large
 * @returns Validation result with ratio and compliance info
 */
export function validateColorPair(
  bgColor: string,
  textColor: string,
  largeText = false
) {
  const ratio = calculateContrastRatio(bgColor, textColor)
  const level = getWCAGLevel(ratio, largeText)

  return {
    ratio,
    level,
    meetsAA: meetsWCAG_AA(bgColor, textColor, largeText),
    meetsAAA: meetsWCAG_AAA(bgColor, textColor, largeText),
    isAccessible: level !== 'Fail',
    recommendation: level === 'Fail'
      ? `Contrast ratio ${ratio.toFixed(2)}:1 is below WCAG AA minimum (${
          largeText ? '3:1' : '4.5:1'
        }). Consider using a ${
          getContrastingTextColor(bgColor) === '#ffffff' ? 'lighter' : 'darker'
        } text color.`
      : level === 'AA'
      ? 'Meets WCAG AA minimum. Consider improving to AAA for enhanced accessibility.'
      : 'Meets WCAG AAA enhanced standard. Excellent contrast!',
  }
}
