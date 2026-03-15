/**
 * Analytics utilities re-exported from @veritio/analysis-shared
 *
 * This file provides a local import path for common analytics utilities
 * used throughout the prototype test analysis components.
 */

// Re-export all analytics utilities from analysis-shared
export {
  normalizeToPercent,
  scaleToDisplay,
  normalizeClickCoordinates,
  aggregateClicksToHeatmapPoints,
  calculateClickBounds,
  normalizeDecimalToPercent,
  normalizeFirstClickCoordinates,
  exportElementToPNG,
  generateHeatmapFilename,
  exportClicksToCSV,
  HEATMAP_PALETTES,
  PALETTE_OPTIONS,
  getPaletteGradient,
  getPaletteOption,
  type PaletteOption,
} from '@veritio/analysis-shared/lib/analytics'
