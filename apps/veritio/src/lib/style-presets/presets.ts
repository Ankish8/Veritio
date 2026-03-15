/**
 * Style Preset Configurations
 *
 * Each preset defines a complete visual style for participant UI.
 * The 'default' preset matches the actual participant UI styling exactly.
 */

import type {
  StylePreset,
  StylePresetId,
  RadiusOption,
  StyleCSSVariables,
} from './types'

/**
 * All available style presets
 */
export const STYLE_PRESETS: Record<StylePresetId, StylePreset> = {
  /**
   * DEFAULT - Matches actual participant UI
   * Uses slate color palette (slate-100 = #F1F5F9 for inputs)
   * Uses rounded-xl (12px) for cards and inputs to match actual UI
   * This is the actual styling used in the participant-facing study flow
   */
  default: {
    id: 'default',
    name: 'Default',
    description: 'Clean and modern',
    preview: {
      cardBg: '#ffffff',
      cardBorder: '#e2e8f0', // slate-200
      hasShadow: true,
      fontWeight: 'medium',
    },
    cssVariables: {
      '--style-radius': '12px', // rounded-xl - matches actual card/input radius
      '--style-radius-sm': '8px', // rounded-lg
      '--style-radius-lg': '16px', // rounded-2xl
      '--style-radius-xl': '24px', // rounded-3xl
      '--style-shadow-sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      '--style-shadow': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
      '--style-shadow-md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
      '--style-shadow-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
      '--style-border-width': '1px',
      '--style-border-opacity': '1',
      '--style-card-bg': '#ffffff',
      '--style-card-border': 'rgb(226, 232, 240)', // slate-200
      '--style-input-bg': 'rgb(241, 245, 249)', // slate-100 - the actual input bg color
      '--style-input-border': 'transparent',
      '--style-button-radius': '12px', // rounded-xl - matches actual button radius
      '--style-button-shadow': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      '--style-button-font-weight': '500',
      // Text colors (light mode)
      '--style-text-primary': '#0f172a', // slate-900
      '--style-text-secondary': '#64748b', // slate-500
      '--style-text-muted': '#94a3b8', // slate-400
      // Background colors (light mode)
      '--style-bg-muted': '#f1f5f9', // slate-100
      '--style-border-muted': '#e2e8f0', // slate-200
      // Page background
      '--style-page-bg': '#f8fafc', // slate-50 - clean slate palette
    },
    darkVariables: {
      '--style-card-bg': '#1c1c1e', // Neutral dark gray (no blue tint)
      '--style-card-border': 'rgb(58, 58, 60)', // Neutral gray border
      '--style-input-bg': 'rgba(255, 255, 255, 0.05)',
      '--style-input-border': 'rgba(255, 255, 255, 0.1)',
      '--style-text-primary': '#fafafa', // zinc-50
      '--style-text-secondary': '#a1a1aa', // zinc-400
      '--style-text-muted': '#71717a', // zinc-500
      '--style-bg-muted': 'rgba(255, 255, 255, 0.05)',
      '--style-border-muted': 'rgba(255, 255, 255, 0.1)',
      '--style-page-bg': '#121214', // Deep neutral dark
    },
  },

  /**
   * VEGA - Bold, high-contrast
   * Prominent shadows, strong definition, confident presence
   */
  vega: {
    id: 'vega',
    name: 'Vega',
    description: 'Bold and high-contrast',
    preview: {
      cardBg: '#fafafa',
      cardBorder: '#d4d4d4',
      hasShadow: true,
      fontWeight: 'semibold',
    },
    cssVariables: {
      '--style-radius': '6px',
      '--style-radius-sm': '3px',
      '--style-radius-lg': '10px',
      '--style-radius-xl': '14px',
      '--style-shadow-sm': '0 2px 4px 0 rgba(0, 0, 0, 0.1)',
      '--style-shadow': '0 4px 8px 0 rgba(0, 0, 0, 0.12), 0 2px 4px -1px rgba(0, 0, 0, 0.08)',
      '--style-shadow-md': '0 8px 16px -2px rgba(0, 0, 0, 0.15), 0 4px 8px -2px rgba(0, 0, 0, 0.1)',
      '--style-shadow-lg': '0 16px 32px -4px rgba(0, 0, 0, 0.2), 0 8px 16px -4px rgba(0, 0, 0, 0.1)',
      '--style-border-width': '2px',
      '--style-border-opacity': '1',
      '--style-card-bg': '#fafafa',
      '--style-card-border': 'rgb(212, 212, 212)',
      '--style-input-bg': '#ffffff',
      '--style-input-border': 'rgb(212, 212, 212)',
      '--style-button-radius': '6px',
      '--style-button-shadow': '0 4px 8px 0 rgba(0, 0, 0, 0.12)',
      '--style-button-font-weight': '600',
      // Text colors (light mode) - neutral palette
      '--style-text-primary': '#171717', // neutral-900
      '--style-text-secondary': '#525252', // neutral-600
      '--style-text-muted': '#a3a3a3', // neutral-400
      // Background colors (light mode)
      '--style-bg-muted': '#f5f5f5', // neutral-100
      '--style-border-muted': '#d4d4d4', // neutral-300
      // Page background - darker to make bold shadows pop
      '--style-page-bg': '#f0f0f0', // neutral-100
    },
    darkVariables: {
      '--style-card-bg': '#1f1f23',
      '--style-card-border': 'rgb(82, 82, 91)',
      '--style-input-bg': '#27272a',
      '--style-input-border': 'rgb(82, 82, 91)',
      '--style-text-primary': '#fafafa', // neutral-50
      '--style-text-secondary': '#a1a1aa', // zinc-400
      '--style-text-muted': '#71717a', // zinc-500
      '--style-bg-muted': 'rgba(255, 255, 255, 0.05)',
      '--style-border-muted': 'rgba(255, 255, 255, 0.1)',
      '--style-page-bg': '#141416', // Deep dark for high contrast
    },
  },

  /**
   * NOVA - Soft, rounded
   * Gentle curves, subtle depth, calming presence
   */
  nova: {
    id: 'nova',
    name: 'Nova',
    description: 'Soft and rounded',
    preview: {
      cardBg: '#ffffff',
      cardBorder: 'transparent',
      hasShadow: true,
      fontWeight: 'normal',
    },
    cssVariables: {
      '--style-radius': '12px',
      '--style-radius-sm': '8px',
      '--style-radius-lg': '16px',
      '--style-radius-xl': '24px',
      '--style-shadow-sm': '0 1px 2px 0 rgba(0, 0, 0, 0.03)',
      '--style-shadow': '0 2px 8px 0 rgba(0, 0, 0, 0.06), 0 1px 2px -1px rgba(0, 0, 0, 0.04)',
      '--style-shadow-md': '0 6px 16px -2px rgba(0, 0, 0, 0.08), 0 2px 6px -2px rgba(0, 0, 0, 0.04)',
      '--style-shadow-lg': '0 12px 24px -4px rgba(0, 0, 0, 0.1), 0 4px 8px -4px rgba(0, 0, 0, 0.04)',
      '--style-border-width': '1px',
      '--style-border-opacity': '0.5',
      '--style-card-bg': '#ffffff',
      '--style-card-border': 'rgba(0, 0, 0, 0.06)',
      '--style-input-bg': 'rgb(250, 250, 250)',
      '--style-input-border': 'transparent',
      '--style-button-radius': '12px',
      '--style-button-shadow': '0 2px 8px 0 rgba(0, 0, 0, 0.06)',
      '--style-button-font-weight': '500',
      // Text colors (light mode) - soft neutral
      '--style-text-primary': '#1c1917', // stone-900
      '--style-text-secondary': '#78716c', // stone-500
      '--style-text-muted': '#a8a29e', // stone-400
      // Background colors (light mode)
      '--style-bg-muted': '#fafaf9', // stone-50
      '--style-border-muted': 'rgba(0, 0, 0, 0.06)',
      // Page background - soft warm undertones
      '--style-page-bg': '#fafaf9', // stone-50
    },
    darkVariables: {
      '--style-card-bg': '#1c1c1e',
      '--style-card-border': 'rgba(255, 255, 255, 0.06)',
      '--style-input-bg': 'rgba(255, 255, 255, 0.04)',
      '--style-input-border': 'transparent',
      '--style-text-primary': '#fafafa',
      '--style-text-secondary': '#a1a1aa',
      '--style-text-muted': '#71717a',
      '--style-bg-muted': 'rgba(255, 255, 255, 0.04)',
      '--style-border-muted': 'rgba(255, 255, 255, 0.06)',
      '--style-page-bg': '#141416', // Soft dark
    },
  },

  /**
   * MAIA - Minimal, flat
   * No shadows, thin borders, clean lines, focused
   */
  maia: {
    id: 'maia',
    name: 'Maia',
    description: 'Minimal and flat',
    preview: {
      cardBg: '#ffffff',
      cardBorder: '#e5e5e5',
      hasShadow: false,
      fontWeight: 'medium',
    },
    cssVariables: {
      '--style-radius': '4px',
      '--style-radius-sm': '2px',
      '--style-radius-lg': '6px',
      '--style-radius-xl': '8px',
      '--style-shadow-sm': 'none',
      '--style-shadow': 'none',
      '--style-shadow-md': 'none',
      '--style-shadow-lg': 'none',
      '--style-border-width': '1px',
      '--style-border-opacity': '1',
      '--style-card-bg': '#ffffff',
      '--style-card-border': 'rgb(229, 229, 229)',
      '--style-input-bg': 'transparent',
      '--style-input-border': 'rgb(212, 212, 212)',
      '--style-button-radius': '4px',
      '--style-button-shadow': 'none',
      '--style-button-font-weight': '500',
      // Text colors (light mode) - neutral
      '--style-text-primary': '#171717', // neutral-900
      '--style-text-secondary': '#525252', // neutral-600
      '--style-text-muted': '#a3a3a3', // neutral-400
      // Background colors (light mode)
      '--style-bg-muted': '#f5f5f5', // neutral-100
      '--style-border-muted': '#e5e5e5', // neutral-200
      // Page background - pure neutral for minimal look
      '--style-page-bg': '#fafafa', // neutral-50
    },
    darkVariables: {
      '--style-card-bg': '#18181b',
      '--style-card-border': 'rgb(63, 63, 70)',
      '--style-input-bg': 'transparent',
      '--style-input-border': 'rgb(82, 82, 91)',
      '--style-text-primary': '#fafafa',
      '--style-text-secondary': '#a1a1aa',
      '--style-text-muted': '#71717a',
      '--style-bg-muted': 'rgba(255, 255, 255, 0.05)',
      '--style-border-muted': 'rgba(255, 255, 255, 0.1)',
      '--style-page-bg': '#111113', // Very dark for clean separation
    },
  },

  /**
   * LYRA - Warm, professional
   * Stone color palette, subtle warmth, clean professional look
   * (Previously the default style - uses stone-100 inputs)
   */
  lyra: {
    id: 'lyra',
    name: 'Lyra',
    description: 'Warm and professional',
    preview: {
      cardBg: '#ffffff',
      cardBorder: '#e7e5e4', // stone-200
      hasShadow: true,
      fontWeight: 'medium',
    },
    cssVariables: {
      '--style-radius': '8px',
      '--style-radius-sm': '4px',
      '--style-radius-lg': '12px',
      '--style-radius-xl': '16px',
      '--style-shadow-sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      '--style-shadow': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
      '--style-shadow-md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
      '--style-shadow-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
      '--style-border-width': '1px',
      '--style-border-opacity': '1',
      '--style-card-bg': '#ffffff',
      '--style-card-border': 'rgb(231, 229, 228)', // stone-200
      '--style-input-bg': 'rgb(245, 245, 244)', // stone-100
      '--style-input-border': 'transparent',
      '--style-button-radius': '8px',
      '--style-button-shadow': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      '--style-button-font-weight': '500',
      // Text colors (light mode) - warm stone
      '--style-text-primary': '#1c1917', // stone-900
      '--style-text-secondary': '#57534e', // stone-600
      '--style-text-muted': '#78716c', // stone-500
      // Background colors (light mode)
      '--style-bg-muted': '#fafaf9', // stone-50
      '--style-border-muted': '#e7e5e4', // stone-200
      // Page background - warm stone palette
      '--style-page-bg': '#f5f5f4', // stone-100
    },
    darkVariables: {
      '--style-card-bg': '#27272a', // zinc-800
      '--style-card-border': 'rgb(63, 63, 70)', // zinc-700
      '--style-input-bg': 'rgba(255, 255, 255, 0.05)',
      '--style-input-border': 'rgba(255, 255, 255, 0.1)',
      '--style-text-primary': '#fafafa',
      '--style-text-secondary': '#a1a1aa',
      '--style-text-muted': '#71717a',
      '--style-bg-muted': 'rgba(255, 255, 255, 0.05)',
      '--style-border-muted': 'rgba(255, 255, 255, 0.1)',
      '--style-page-bg': '#1c1917', // stone-900 - warm dark
    },
  },

  /**
   * MIRA - Playful, vibrant
   * Large radii, friendly feel, approachable
   */
  mira: {
    id: 'mira',
    name: 'Mira',
    description: 'Playful and vibrant',
    preview: {
      cardBg: '#ffffff',
      cardBorder: '#e5e5e5',
      hasShadow: true,
      fontWeight: 'semibold',
    },
    cssVariables: {
      '--style-radius': '16px',
      '--style-radius-sm': '10px',
      '--style-radius-lg': '20px',
      '--style-radius-xl': '28px',
      '--style-shadow-sm': '0 1px 3px 0 rgba(0, 0, 0, 0.08)',
      '--style-shadow': '0 2px 6px 0 rgba(0, 0, 0, 0.1), 0 1px 3px -1px rgba(0, 0, 0, 0.06)',
      '--style-shadow-md': '0 6px 12px -2px rgba(0, 0, 0, 0.12), 0 3px 6px -2px rgba(0, 0, 0, 0.06)',
      '--style-shadow-lg': '0 12px 24px -4px rgba(0, 0, 0, 0.15), 0 6px 12px -4px rgba(0, 0, 0, 0.08)',
      '--style-border-width': '2px',
      '--style-border-opacity': '0.8',
      '--style-card-bg': '#ffffff',
      '--style-card-border': 'rgba(0, 0, 0, 0.08)',
      '--style-input-bg': 'rgb(248, 248, 248)',
      '--style-input-border': 'transparent',
      '--style-button-radius': '16px',
      '--style-button-shadow': '0 2px 6px 0 rgba(0, 0, 0, 0.1)',
      '--style-button-font-weight': '600',
      // Text colors (light mode) - neutral
      '--style-text-primary': '#171717', // neutral-900
      '--style-text-secondary': '#525252', // neutral-600
      '--style-text-muted': '#a3a3a3', // neutral-400
      // Background colors (light mode)
      '--style-bg-muted': '#f8f8f8',
      '--style-border-muted': 'rgba(0, 0, 0, 0.08)',
      // Page background - light neutral lets brand colors shine
      '--style-page-bg': '#f9fafb', // gray-50
    },
    darkVariables: {
      '--style-card-bg': '#202024',
      '--style-card-border': 'rgba(255, 255, 255, 0.08)',
      '--style-input-bg': 'rgba(255, 255, 255, 0.04)',
      '--style-input-border': 'transparent',
      '--style-text-primary': '#fafafa',
      '--style-text-secondary': '#a1a1aa',
      '--style-text-muted': '#71717a',
      '--style-bg-muted': 'rgba(255, 255, 255, 0.04)',
      '--style-border-muted': 'rgba(255, 255, 255, 0.08)',
      '--style-page-bg': '#18181a', // Playful dark
    },
  },
}

/**
 * Get preset info for display in selector
 */
export function getPresetInfo(id: StylePresetId): StylePreset {
  return STYLE_PRESETS[id]
}

/**
 * Get all preset IDs for iteration
 */
export function getAllPresetIds(): StylePresetId[] {
  return Object.keys(STYLE_PRESETS) as StylePresetId[]
}

/**
 * Get CSS variables for a preset with optional radius override
 */
export function getPresetCSSVariables(
  presetId: StylePresetId,
  radiusOverride?: RadiusOption
): StyleCSSVariables {
  const preset = STYLE_PRESETS[presetId]
  const variables = { ...preset.cssVariables }

  // Apply radius override if specified and not 'default'
  if (radiusOverride && radiusOverride !== 'default') {
    const baseRadius =
      radiusOverride === 'none' ? 0 : radiusOverride === 'small' ? 4 : 16

    variables['--style-radius'] = `${baseRadius}px`
    variables['--style-radius-sm'] = `${Math.max(0, baseRadius - 4)}px`
    variables['--style-radius-lg'] = `${baseRadius + 4}px`
    variables['--style-radius-xl'] = `${baseRadius + 8}px`
    variables['--style-button-radius'] = `${baseRadius}px`
  }

  return variables
}

/**
 * Get dark mode CSS variable overrides for a preset
 */
export function getPresetDarkVariables(
  presetId: StylePresetId
): StyleCSSVariables {
  const preset = STYLE_PRESETS[presetId]
  return {
    ...preset.cssVariables,
    ...preset.darkVariables,
  }
}
