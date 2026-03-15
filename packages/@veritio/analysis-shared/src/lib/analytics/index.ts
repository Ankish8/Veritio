/**
 * Analytics utilities for click maps and heatmaps
 */

export {
  normalizeToPercent,
  scaleToDisplay,
  normalizeClickCoordinates,
  aggregateClicksToHeatmapPoints,
  calculateClickBounds,
  normalizeDecimalToPercent,
  normalizeFirstClickCoordinates,
  calculateLetterboxOffset,
  type LetterboxOffset,
} from './coordinate-normalization'

export {
  exportElementToPNG,
  generateHeatmapFilename,
  exportClicksToCSV,
} from './heatmap-export'

export {
  HEATMAP_PALETTES,
  PALETTE_OPTIONS,
  getPaletteGradient,
  getPaletteOption,
  type PaletteOption,
} from './heatmap-presets'
