/**
 * Heatmap color palette presets and configurations
 *
 * Each palette defines gradient stops from 0.0 (coldest/least clicks)
 * to 1.0 (hottest/most clicks). These are used by heatmap.js for rendering.
 */

import type { HeatmapPalette } from '@/types/analytics'

/**
 * Gradient definitions for each palette
 * Keys are gradient stops (0.0 to 1.0), values are CSS color strings
 */
export const HEATMAP_PALETTES: Record<HeatmapPalette, Record<number, string>> = {
  // Classic rainbow: Blue (cold) -> Red (hot) - industry standard
  classic: {
    0.0: 'blue',
    0.25: 'cyan',
    0.5: 'lime',
    0.75: 'yellow',
    1.0: 'red',
  },

  // Alternative: Purple -> Red - different color scheme option
  'high-contrast': {
    0.0: '#722ED1',
    0.25: '#1890FF',
    0.5: '#52C41A',
    0.75: '#FAAD14',
    1.0: '#F5222D',
  },
}

/**
 * Palette options for UI selectors
 */
export interface PaletteOption {
  value: HeatmapPalette
  label: string
  description: string
  previewColors: string[] // Sample colors for visual preview
}

export const PALETTE_OPTIONS: PaletteOption[] = [
  {
    value: 'classic',
    label: 'Classic',
    description: 'Blue to Red gradient',
    previewColors: ['blue', 'cyan', 'lime', 'yellow', 'red'],
  },
  {
    value: 'high-contrast',
    label: 'Alternative',
    description: 'Purple to Red gradient',
    previewColors: ['#722ED1', '#1890FF', '#52C41A', '#FAAD14', '#F5222D'],
  },
]

/**
 * Get gradient config for a specific palette
 */
export function getPaletteGradient(palette: HeatmapPalette): Record<number, string> {
  return HEATMAP_PALETTES[palette] || HEATMAP_PALETTES.classic
}

/**
 * Get palette option by value
 */
export function getPaletteOption(palette: HeatmapPalette): PaletteOption | undefined {
  return PALETTE_OPTIONS.find((opt) => opt.value === palette)
}
