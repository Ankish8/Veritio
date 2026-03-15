'use client'

import { useState, useEffect } from 'react'
import { Sun, Moon } from 'lucide-react'
import { generateBrandPalette, generateDarkBrandPalette } from '@/lib/brand-colors'
import { STYLE_PRESETS } from '@/lib/style-presets'
import { cn } from '@/lib/utils'
import type { StylePreset, ThemeMode, RadiusOption } from '@/lib/supabase/user-preferences-types'

// Radius options mapping
const RADIUS_PIXELS: Record<RadiusOption, number> = {
  none: 0,
  small: 4,
  default: 8,
  large: 16,
}

// Sample data for preview
const SAMPLE_OPTIONS = [
  { id: '1', label: 'Very satisfied' },
  { id: '2', label: 'Satisfied' },
  { id: '3', label: 'Neutral' },
]

const SAMPLE_CHECKBOXES = [
  { id: 'a', label: 'Option A', checked: true },
  { id: 'b', label: 'Option B', checked: false },
  { id: 'c', label: 'Option C', checked: true },
]

interface BrandingPreviewStandaloneProps {
  primaryColor?: string
  stylePreset?: StylePreset
  themeMode?: ThemeMode
  radiusOption?: RadiusOption
}

export function BrandingPreviewStandalone({
  primaryColor = '#007A66',
  stylePreset: presetId = 'default',
  themeMode = 'light',
  radiusOption = 'default',
}: BrandingPreviewStandaloneProps) {
  const [previewTheme, setPreviewTheme] = useState<'light' | 'dark'>('light')

  // Auto-sync preview theme with theme mode selection
  useEffect(() => {
    if (themeMode === 'light' || themeMode === 'dark') {
      setPreviewTheme(themeMode) // eslint-disable-line react-hooks/set-state-in-effect
    }
  }, [themeMode])

  // Generate palettes for preview
  const lightPalette = generateBrandPalette(primaryColor)
  const darkPalette = generateDarkBrandPalette(primaryColor)
  const previewPalette = previewTheme === 'dark' ? darkPalette : lightPalette

  // Get style preset info
  const stylePreset = STYLE_PRESETS[presetId] || STYLE_PRESETS.default

  // Get preview radius value
  const previewRadius = (() => {
    if (radiusOption === 'default') {
      const presetRadius = stylePreset.cssVariables['--style-radius']
      return parseInt(presetRadius.replace('px', ''), 10) ?? 8
    }
    return RADIUS_PIXELS[radiusOption] ?? 8
  })()

  return (
    <div className="flex flex-col h-full min-h-[400px]">
      {/* Preview header */}
      <div className="flex items-center justify-between px-1 mb-2">
        <span className="text-xs text-muted-foreground">Preview</span>
        <div className="flex items-center gap-1 p-0.5 bg-muted rounded-md">
          <button
            type="button"
            onClick={() => setPreviewTheme('light')}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors',
              previewTheme === 'light' ? 'bg-background shadow-sm' : 'text-muted-foreground'
            )}
          >
            <Sun className="h-3 w-3" />
            Light
          </button>
          <button
            type="button"
            onClick={() => setPreviewTheme('dark')}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors',
              previewTheme === 'dark' ? 'bg-stone-800 text-white dark:bg-stone-700' : 'text-muted-foreground'
            )}
          >
            <Moon className="h-3 w-3" />
            Dark
          </button>
        </div>
      </div>

      {/* Full-size preview */}
      <div
        className="flex-1 rounded-lg border border-border overflow-hidden transition-colors"
        style={{
          backgroundColor: previewTheme === 'dark'
            ? (stylePreset.darkVariables['--style-page-bg'] || '#121214')
            : (stylePreset.cssVariables['--style-page-bg'] || '#f5f5f4'),
          '--preview-radius': `${previewRadius}px`,
          '--preview-card-bg': previewTheme === 'dark' ? stylePreset.darkVariables['--style-card-bg'] : stylePreset.cssVariables['--style-card-bg'],
          '--preview-card-border': previewTheme === 'dark' ? stylePreset.darkVariables['--style-card-border'] : stylePreset.cssVariables['--style-card-border'],
          '--preview-input-bg': previewTheme === 'dark' ? stylePreset.darkVariables['--style-input-bg'] : stylePreset.cssVariables['--style-input-bg'],
          '--preview-input-border': previewTheme === 'dark' ? (stylePreset.darkVariables['--style-input-border'] || 'rgba(255,255,255,0.1)') : (stylePreset.cssVariables['--style-input-border'] || 'transparent'),
          '--preview-text': previewTheme === 'dark' ? '#fafafa' : '#1c1917',
          '--preview-text-muted': previewTheme === 'dark' ? '#a1a1aa' : '#78716c',
          '--preview-text-secondary': previewTheme === 'dark' ? '#e4e4e7' : '#44403c',
          '--preview-border-muted': previewTheme === 'dark' ? '#52525b' : '#d1d5db',
          '--preview-brand': previewPalette.brand,
          '--preview-brand-fg': previewPalette.brandForeground,
        } as React.CSSProperties}
      >
        <div className="h-full flex flex-col">
          {/* Main content area */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="max-w-2xl mx-auto">
              {/* Card with form elements */}
              <div
                className="p-4"
                style={{
                  backgroundColor: 'var(--preview-card-bg)',
                  border: stylePreset.preview.cardBorder !== 'transparent' ? '1px solid var(--preview-card-border)' : 'none',
                  borderRadius: 'var(--preview-radius)',
                  boxShadow: stylePreset.preview.hasShadow ? (previewTheme === 'dark' ? '0 2px 8px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.1)') : 'none',
                }}
              >
                {/* Title */}
                <h2 className="text-base font-semibold mb-1" style={{ color: 'var(--preview-text)' }}>
                  Sample Survey
                </h2>
                <p className="text-xs mb-4" style={{ color: 'var(--preview-text-muted)' }}>
                  This preview shows how your study will look.
                </p>

                <div className="space-y-3">
                  {/* Text Input */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium" style={{ color: 'var(--preview-text)' }}>
                      Your name<span style={{ color: 'var(--preview-brand)' }}> *</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Enter your name"
                      readOnly
                      className="w-full px-2.5 py-1.5 text-xs outline-none"
                      style={{
                        backgroundColor: 'var(--preview-input-bg)',
                        border: '1px solid var(--preview-input-border)',
                        borderRadius: 'var(--preview-radius)',
                        color: 'var(--preview-text)',
                      }}
                    />
                  </div>

                  {/* Radio + Checkboxes Row */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* Radio buttons */}
                    <div className="space-y-1">
                      <label className="text-xs font-medium" style={{ color: 'var(--preview-text)' }}>
                        Satisfaction<span style={{ color: 'var(--preview-brand)' }}> *</span>
                      </label>
                      <div className="space-y-1 pt-0.5">
                        {SAMPLE_OPTIONS.map((option, i) => (
                          <label key={option.id} className="flex items-center gap-1.5 cursor-pointer">
                            <div
                              className="h-3 w-3 rounded-full flex items-center justify-center flex-shrink-0"
                              style={{ border: `1.5px solid ${i === 0 ? 'var(--preview-brand)' : 'var(--preview-border-muted)'}` }}
                            >
                              {i === 0 && <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: 'var(--preview-brand)' }} />}
                            </div>
                            <span className="text-xs" style={{ color: 'var(--preview-text-secondary)' }}>{option.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Checkboxes */}
                    <div className="space-y-1">
                      <label className="text-xs font-medium" style={{ color: 'var(--preview-text)' }}>
                        Select all that apply
                      </label>
                      <div className="space-y-1 pt-0.5">
                        {SAMPLE_CHECKBOXES.map((opt) => (
                          <label key={opt.id} className="flex items-center gap-1.5 cursor-pointer">
                            <div
                              className="h-3 w-3 flex items-center justify-center flex-shrink-0"
                              style={{
                                backgroundColor: opt.checked ? 'var(--preview-brand)' : 'transparent',
                                border: `1.5px solid ${opt.checked ? 'var(--preview-brand)' : 'var(--preview-border-muted)'}`,
                                borderRadius: `${previewRadius / 4}px`,
                              }}
                            >
                              {opt.checked && (
                                <svg
                                  className="h-2 w-2"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  strokeWidth={3}
                                  style={{ stroke: 'var(--preview-brand-fg)' }}
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                            <span className="text-xs" style={{ color: 'var(--preview-text-secondary)' }}>{opt.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Button */}
                <div className="mt-4 flex justify-end">
                  <button
                    className="px-4 py-1.5 text-xs font-medium"
                    style={{
                      backgroundColor: 'var(--preview-brand)',
                      color: 'var(--preview-brand-fg)',
                      borderRadius: 'var(--preview-radius)',
                    }}
                  >
                    Continue
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
