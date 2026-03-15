'use client'

import { useState, useEffect } from 'react'
import { Sun, Moon } from 'lucide-react'
import { useStudyMetaStore } from '@/stores/study-meta-store'
import { generateBrandPalette, generateDarkBrandPalette } from '@/lib/brand-colors'
import { STYLE_PRESETS } from '@/lib/style-presets'
import { LOGO_PREVIEW_SCALE } from '@/components/builders/shared/types'
import { RADIUS_OPTIONS, SAMPLE_OPTIONS, SAMPLE_CHECKBOXES } from '../constants'
import { cn } from '@/lib/utils'

export function BrandingPreview() {
  const { meta } = useStudyMetaStore()
  const [previewTheme, setPreviewTheme] = useState<'light' | 'dark'>('light')

  // Auto-sync preview theme with theme mode selection
  useEffect(() => {
    const themeMode = meta.branding.themeMode || 'light'
    if (themeMode === 'light' || themeMode === 'dark') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPreviewTheme(themeMode)
    }
  }, [meta.branding.themeMode])

  // Get current values with defaults
  const currentStylePreset = meta.branding.stylePreset || 'default'
  const currentRadius = meta.branding.radiusOption || 'default'

  // Generate palettes for preview
  const lightPalette = generateBrandPalette(meta.branding.primaryColor || '#007A66')
  const darkPalette = generateDarkBrandPalette(meta.branding.primaryColor || '#007A66')
  const previewPalette = previewTheme === 'dark' ? darkPalette : lightPalette

  // Get style preset info
  const stylePreset = STYLE_PRESETS[currentStylePreset]

  // Get preview radius value
  const previewRadius = currentRadius === 'default'
    ? parseInt(stylePreset.cssVariables['--style-radius'].replace('px', ''), 10) || 8
    : RADIUS_OPTIONS.find(r => r.value === currentRadius)?.pixels ?? 8

  return (
    <div className="hidden md:flex flex-1 flex-col min-h-0 gap-2">
      {/* Preview header */}
      <div className="flex items-center justify-between px-1">
        <span className="text-xs text-muted-foreground">Preview</span>
        <div className="flex items-center gap-1 p-0.5 bg-stone-100 rounded-md">
          <button
            type="button"
            onClick={() => setPreviewTheme('light')}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors',
              previewTheme === 'light' ? 'bg-white shadow-sm' : 'text-muted-foreground'
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
              previewTheme === 'dark' ? 'bg-stone-800 text-white' : 'text-muted-foreground'
            )}
          >
            <Moon className="h-3 w-3" />
            Dark
          </button>
        </div>
      </div>

      {/* Full-size preview */}
      <div
        className="flex-1 rounded-lg border border-stone-200 overflow-hidden transition-colors"
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
          {/* Logo Header */}
          {meta.branding.logo?.url && (
            <div
              className="px-6 py-3 border-b flex justify-center flex-shrink-0"
              style={{
                backgroundColor: previewTheme === 'dark' ? '#242426' : '#ffffff',
                borderColor: previewTheme === 'dark' ? '#3a3a3c' : '#e7e5e4',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={meta.branding.logo.url}
                alt="Logo"
                className="max-w-[180px] object-contain"
                style={{ height: (meta.branding.logoSize || 32) * LOGO_PREVIEW_SCALE }}
              />
            </div>
          )}

          {/* Main content area */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-2xl mx-auto">
              {/* Card with form elements */}
              <div
                className="p-6"
                style={{
                  backgroundColor: 'var(--preview-card-bg)',
                  border: stylePreset.preview.cardBorder !== 'transparent' ? '1px solid var(--preview-card-border)' : 'none',
                  borderRadius: 'var(--preview-radius)',
                  boxShadow: stylePreset.preview.hasShadow ? (previewTheme === 'dark' ? '0 2px 8px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.1)') : 'none',
                }}
              >
                {/* Title */}
                <h2 className="text-lg font-semibold mb-1" style={{ color: 'var(--preview-text)' }}>
                  Sample Survey
                </h2>
                <p className="text-sm mb-5" style={{ color: 'var(--preview-text-muted)' }}>
                  This preview shows how your study will look to participants.
                </p>

                <div className="space-y-4">
                  {/* Row 1: Text Input + Dropdown */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Text Input */}
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium" style={{ color: 'var(--preview-text)' }}>
                        Your name<span style={{ color: 'var(--preview-brand)' }}> *</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Enter your name"
                        readOnly
                        className="w-full px-3 py-2 text-sm outline-none"
                        style={{
                          backgroundColor: 'var(--preview-input-bg)',
                          border: '1px solid var(--preview-input-border)',
                          borderRadius: 'var(--preview-radius)',
                          color: 'var(--preview-text)',
                        }}
                      />
                    </div>

                    {/* Dropdown */}
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium" style={{ color: 'var(--preview-text)' }}>
                        Select an option
                      </label>
                      <div
                        className="w-full px-3 py-2 text-sm flex items-center justify-between"
                        style={{
                          backgroundColor: 'var(--preview-input-bg)',
                          border: '1px solid var(--preview-input-border)',
                          borderRadius: 'var(--preview-radius)',
                          color: 'var(--preview-text-muted)',
                        }}
                      >
                        <span>Choose...</span>
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Radio + Checkboxes */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Radio buttons */}
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium" style={{ color: 'var(--preview-text)' }}>
                        How satisfied are you?<span style={{ color: 'var(--preview-brand)' }}> *</span>
                      </label>
                      <div className="space-y-1.5 pt-1">
                        {SAMPLE_OPTIONS.map((option, i) => (
                          <label key={option.id} className="flex items-center gap-2 cursor-pointer">
                            <div
                              className="h-4 w-4 rounded-full flex items-center justify-center flex-shrink-0"
                              style={{ border: `2px solid ${i === 0 ? 'var(--preview-brand)' : 'var(--preview-border-muted)'}` }}
                            >
                              {i === 0 && <div className="h-2 w-2 rounded-full" style={{ backgroundColor: 'var(--preview-brand)' }} />}
                            </div>
                            <span className="text-sm" style={{ color: 'var(--preview-text-secondary)' }}>{option.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Checkboxes */}
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium" style={{ color: 'var(--preview-text)' }}>
                        Select all that apply
                      </label>
                      <div className="space-y-1.5 pt-1">
                        {SAMPLE_CHECKBOXES.map((opt) => (
                          <label key={opt.id} className="flex items-center gap-2 cursor-pointer">
                            <div
                              className="h-4 w-4 flex items-center justify-center flex-shrink-0"
                              style={{
                                backgroundColor: opt.checked ? 'var(--preview-brand)' : 'transparent',
                                border: `2px solid ${opt.checked ? 'var(--preview-brand)' : 'var(--preview-border-muted)'}`,
                                borderRadius: `${previewRadius / 4}px`,
                              }}
                            >
                              {opt.checked && (
                                <svg
                                  className="h-2.5 w-2.5"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  strokeWidth={3}
                                  style={{ stroke: 'var(--preview-brand-fg)' }}
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                            <span className="text-sm" style={{ color: 'var(--preview-text-secondary)' }}>{opt.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Row 3: Text Area */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium" style={{ color: 'var(--preview-text)' }}>
                      Additional comments
                    </label>
                    <textarea
                      placeholder="Share your thoughts..."
                      readOnly
                      rows={2}
                      className="w-full px-3 py-2 text-sm outline-none resize-none"
                      style={{
                        backgroundColor: 'var(--preview-input-bg)',
                        border: '1px solid var(--preview-input-border)',
                        borderRadius: 'var(--preview-radius)',
                        color: 'var(--preview-text)',
                      }}
                    />
                  </div>
                </div>

                {/* Button */}
                <div className="mt-5 flex justify-end">
                  <button
                    className="px-6 py-2 text-sm font-medium"
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
