/**
 * Heatmap Color Utilities
 *
 * Shared color functions for heatmap visualizations.
 * Uses a blue color scale consistent across all matrix visualizations.
 */

/**
 * Blue color stops for heatmap gradients
 */
export const HEATMAP_COLORS = {
  blue800: 'rgb(30, 64, 175)',
  blue600: 'rgb(37, 99, 235)',
  blue500: 'rgb(59, 130, 246)',
  blue400: 'rgb(96, 165, 250)',
  blue300: 'rgb(147, 197, 253)',
  blue200: 'rgb(191, 219, 254)',
  blue100: 'rgb(219, 234, 254)',
  blue50: 'rgb(239, 246, 255)',
  slate50: 'rgb(248, 250, 252)',
} as const

/**
 * Default thresholds for percentage-based heatmap coloring
 */
export const DEFAULT_HEATMAP_THRESHOLDS = {
  highest: 90,
  high: 75,
  mediumHigh: 60,
  medium: 45,
  mediumLow: 30,
  low: 15,
} as const

/**
 * Get heatmap background color based on percentage value.
 *
 * Uses a blue color scale from light (0%) to deep blue (100%).
 * This is the standard color scheme across all card sort matrices.
 *
 * @param value - Percentage value (0-100)
 * @param thresholds - Optional custom thresholds for color breakpoints
 * @returns RGB color string
 *
 * @example
 * ```ts
 * getHeatmapColor(85) // 'rgb(37, 99, 235)' - blue-600
 * getHeatmapColor(25) // 'rgb(191, 219, 254)' - blue-200
 * ```
 */
export function getHeatmapColor(
  value: number,
  thresholds = DEFAULT_HEATMAP_THRESHOLDS
): string {
  if (value === 100) return HEATMAP_COLORS.blue800
  if (value >= thresholds.highest) return HEATMAP_COLORS.blue600
  if (value >= thresholds.high) return HEATMAP_COLORS.blue500
  if (value >= thresholds.mediumHigh) return HEATMAP_COLORS.blue400
  if (value >= thresholds.medium) return HEATMAP_COLORS.blue300
  if (value >= thresholds.mediumLow) return HEATMAP_COLORS.blue200
  if (value >= thresholds.low) return HEATMAP_COLORS.blue100
  if (value > 0) return HEATMAP_COLORS.blue50
  return HEATMAP_COLORS.slate50
}

/**
 * Get text color for contrast against heatmap background.
 *
 * Returns white for darker backgrounds (high percentages),
 * dark gray/slate for lighter backgrounds (low percentages).
 *
 * @param value - Percentage value (0-100)
 * @param contrastThreshold - Threshold for switching to white text (default: 60)
 * @returns RGB color string
 *
 * @example
 * ```ts
 * getHeatmapTextColor(85) // 'rgb(255, 255, 255)' - white
 * getHeatmapTextColor(25) // 'rgb(30, 41, 59)' - slate-800
 * ```
 */
export function getHeatmapTextColor(
  value: number,
  contrastThreshold = 60
): string {
  return value >= contrastThreshold
    ? 'rgb(255, 255, 255)'  // white
    : 'rgb(30, 41, 59)'     // slate-800
}

/**
 * Alternative text color using gray instead of slate.
 * Some components use this for slightly softer contrast.
 *
 * @param value - Percentage value (0-100)
 * @param contrastThreshold - Threshold for switching to white text (default: 60)
 * @returns RGB color string
 */
export function getHeatmapTextColorGray(
  value: number,
  contrastThreshold = 60
): string {
  return value >= contrastThreshold
    ? 'rgb(255, 255, 255)'  // white
    : 'rgb(64, 64, 64)'     // gray-600
}
