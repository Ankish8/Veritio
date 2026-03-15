/**
 * Style Preset System Types
 *
 * Defines the type system for customizable visual styles
 * that can be applied to participant-facing study UI.
 */

/**
 * Style preset identifier
 * Each preset defines a distinct visual personality
 */
export type StylePresetId =
  | 'default' // Clean, professional (current styling)
  | 'vega' // Bold, high-contrast with prominent shadows
  | 'nova' // Soft, rounded with subtle depth
  | 'maia' // Minimal, flat with clean lines
  | 'lyra' // Elegant, refined with delicate details
  | 'mira' // Playful, vibrant with friendly curves

/**
 * Border radius options
 */
export type RadiusOption = 'none' | 'small' | 'default' | 'large'

/**
 * Radius values in pixels for each option
 */
export const RADIUS_VALUES: Record<RadiusOption, number> = {
  none: 0,
  small: 4,
  default: 8,
  large: 16,
}

/**
 * Theme mode preference
 */
export type ThemeMode = 'light' | 'dark' | 'system'

/**
 * CSS variables that define a style preset's appearance
 */
export interface StyleCSSVariables {
  // Radius
  '--style-radius': string
  '--style-radius-sm': string
  '--style-radius-lg': string
  '--style-radius-xl': string

  // Shadows
  '--style-shadow-sm': string
  '--style-shadow': string
  '--style-shadow-md': string
  '--style-shadow-lg': string

  // Borders
  '--style-border-width': string
  '--style-border-opacity': string

  // Card styling
  '--style-card-bg': string
  '--style-card-border': string

  // Input styling
  '--style-input-bg': string
  '--style-input-border': string

  // Button styling
  '--style-button-radius': string
  '--style-button-shadow': string
  '--style-button-font-weight': string

  // Text colors
  '--style-text-primary': string
  '--style-text-secondary': string
  '--style-text-muted': string

  // Background colors
  '--style-bg-muted': string
  '--style-border-muted': string

  // Page background
  '--style-page-bg': string
}

/**
 * Dark mode variants for CSS variables
 */
export interface StyleCSSVariablesDark {
  '--style-card-bg': string
  '--style-card-border': string
  '--style-input-bg': string
  '--style-input-border': string
  '--style-text-primary': string
  '--style-text-secondary': string
  '--style-text-muted': string
  '--style-bg-muted': string
  '--style-border-muted': string
  '--style-page-bg': string
}

/**
 * Complete style preset configuration
 */
export interface StylePreset {
  id: StylePresetId
  name: string
  description: string

  // Visual characteristics for selector preview
  preview: {
    cardBg: string
    cardBorder: string
    hasShadow: boolean
    fontWeight: 'normal' | 'medium' | 'semibold'
  }

  // CSS variable values
  cssVariables: StyleCSSVariables

  // Dark mode overrides
  darkVariables: StyleCSSVariablesDark
}

/**
 * Display info for radius options in UI
 */
export interface RadiusOptionInfo {
  value: RadiusOption
  label: string
  pixels: number
}

export const RADIUS_OPTIONS: RadiusOptionInfo[] = [
  { value: 'none', label: 'None', pixels: 0 },
  { value: 'small', label: 'Small', pixels: 4 },
  { value: 'default', label: 'Default', pixels: 8 },
  { value: 'large', label: 'Large', pixels: 16 },
]

/**
 * Display info for theme mode options in UI
 */
export interface ThemeModeInfo {
  value: ThemeMode
  label: string
  description: string
}

export const THEME_MODE_OPTIONS: ThemeModeInfo[] = [
  { value: 'light', label: 'Light', description: 'Always use light theme' },
  { value: 'dark', label: 'Dark', description: 'Always use dark theme' },
  {
    value: 'system',
    label: 'System',
    description: "Follow participant's system preference",
  },
]
