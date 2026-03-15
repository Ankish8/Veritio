import type { HeatmapPalette } from '../../types/analytics'

export const HEATMAP_PALETTES: Record<HeatmapPalette, Record<number, string>> = {
  classic: {
    0.0: 'blue',
    0.25: 'cyan',
    0.5: 'lime',
    0.75: 'yellow',
    1.0: 'red',
  },

  'high-contrast': {
    0.0: '#722ED1',
    0.25: '#1890FF',
    0.5: '#52C41A',
    0.75: '#FAAD14',
    1.0: '#F5222D',
  },
}

export interface PaletteOption {
  value: HeatmapPalette
  label: string
  description: string
  previewColors: string[]
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

export function getPaletteGradient(palette: HeatmapPalette): Record<number, string> {
  return HEATMAP_PALETTES[palette] || HEATMAP_PALETTES.classic
}

export function getPaletteOption(palette: HeatmapPalette): PaletteOption | undefined {
  return PALETTE_OPTIONS.find((opt) => opt.value === palette)
}
