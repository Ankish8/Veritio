// =============================================================================
// Branding Type Definitions

export interface BrandingImage {
  url: string
  filename: string
  size?: number
}

// Logo size constraints (in pixels)
export const LOGO_SIZE_MIN = 24
export const LOGO_SIZE_MAX = 80
export const LOGO_SIZE_DEFAULT = 48

// Preview scaling factor (preview is smaller than actual)
export const LOGO_PREVIEW_SCALE = 0.65
export type StylePresetId =
  | 'default' // Clean, professional (current styling)
  | 'vega' // Bold, high-contrast
  | 'nova' // Soft, rounded
  | 'maia' // Minimal, flat
  | 'lyra' // Elegant, refined
  | 'mira' // Playful, vibrant
export type RadiusOption = 'none' | 'small' | 'default' | 'large'
export type ThemeMode = 'light' | 'dark' | 'system'

export interface BrandingSettings {
  logo?: BrandingImage
  logoSize?: number // Height in pixels (24-80), default 48
  socialImage?: BrandingImage
  primaryColor?: string // Hex color for buttons
  backgroundColor?: string // Hex color for background
  buttonText?: {
    continue?: string // Custom text for "Continue" button
    finished?: string // Custom text for "Finished" button
  }
  cardSortInstructions?: string // Custom default instructions for card sort modal

  // Style customization options
  stylePreset?: StylePresetId // Visual style preset, default: 'default'
  radiusOption?: RadiusOption // Border radius option, default: 'default' (8px)
  themeMode?: ThemeMode // Theme mode, default: 'light'
}

export const DEFAULT_BRANDING: BrandingSettings = {
  themeMode: 'light',
  stylePreset: 'default',
  radiusOption: 'default',
}
