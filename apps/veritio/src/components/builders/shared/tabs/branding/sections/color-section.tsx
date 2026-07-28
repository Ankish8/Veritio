'use client'

import { useState, useEffect } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Check, TriangleAlert } from 'lucide-react'
import { useStudyMetaStore } from '@/stores/study-meta-store'
import {
  generateBrandPalette,
  generateDarkBrandPalette,
  getBrandContrast,
  type BrandTextMode,
} from '@/lib/brand-colors'
import { COLOR_PRESETS } from '../constants'
import { cn } from '@/lib/utils'

interface ColorSectionProps {
  studyId: string
  isReadOnly?: boolean
}

const TEXT_MODES: Array<{ value: BrandTextMode; label: string }> = [
  { value: 'auto', label: 'Auto' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]

/** WCAG AA minimum for body text. Below this we warn but never block. */
const AA_MINIMUM = 4.5

export function ColorSection({ studyId: _studyId, isReadOnly }: ColorSectionProps) {
  const { meta, setPrimaryColor, setBrandTextMode } = useStudyMetaStore()
  const [customHexInput, setCustomHexInput] = useState(meta.branding.primaryColor || '#007A66')

  // Sync custom hex input when primary color changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCustomHexInput(meta.branding.primaryColor || '#007A66')
  }, [meta.branding.primaryColor])

  const brandColor = meta.branding.primaryColor || '#007A66'
  const textMode = meta.branding.brandTextMode ?? 'auto'
  const themeMode = meta.branding.themeMode || 'light'

  // Report the contrast participants will actually see. Dark mode lightens the brand
  // color before painting it, so it needs its own reading.
  const lightContrast = getBrandContrast(brandColor, textMode)
  const darkContrast = getBrandContrast(
    generateDarkBrandPalette(brandColor, textMode).brand,
    textMode
  )
  const showDarkReading = themeMode !== 'light'
  const sampleLabel = meta.branding.buttonText?.continue?.trim() || 'Continue'
  const failing = [lightContrast, ...(showDarkReading ? [darkContrast] : [])].filter(
    (reading) => reading.ratio < AA_MINIMUM
  )

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">Brand Color</Label>
      <p className="text-xs text-muted-foreground">
        Used for buttons and interactive elements.
      </p>

      {/* Color Swatches */}
      <div className="flex flex-wrap gap-1.5">
        {COLOR_PRESETS.map((color) => {
          const isSelected = meta.branding.primaryColor === color
          const swatchPalette = generateBrandPalette(color)
          return (
            <button
              key={color}
              type="button"
              className={cn(
                'relative h-7 w-7 rounded-md transition-all hover:scale-110',
                isSelected
                  ? 'ring-2 ring-foreground ring-offset-1'
                  : 'ring-1 ring-border'
              )}
              style={{ backgroundColor: color }}
              onClick={() => {
                setPrimaryColor(color)
                setCustomHexInput(color)
              }}
              disabled={isReadOnly}
            >
              {isSelected && (
                <Check
                  className="absolute inset-0 m-auto h-3 w-3"
                  style={{ color: swatchPalette.brandForeground }}
                />
              )}
            </button>
          )
        })}
      </div>

      {/* Custom Color */}
      <div className="flex items-center gap-2">
        <label
          htmlFor="custom-color"
          className="relative h-7 w-7 rounded-md cursor-pointer ring-1 ring-border overflow-hidden flex-shrink-0"
          style={{ backgroundColor: meta.branding.primaryColor || '#007A66' }}
        >
          <input
            id="custom-color"
            type="color"
            value={meta.branding.primaryColor || '#007A66'}
            onChange={(e) => {
              const color = e.target.value.toUpperCase()
              setPrimaryColor(color)
              setCustomHexInput(color)
            }}
            disabled={isReadOnly}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </label>
        <Input
          type="text"
          value={customHexInput}
          onChange={(e) => {
            const val = e.target.value.toUpperCase()
            if (/^#[0-9A-F]{0,6}$/.test(val) || val === '') {
              setCustomHexInput(val || '#')
              if (/^#[0-9A-F]{6}$/.test(val)) {
                setPrimaryColor(val)
              }
            }
          }}
          onBlur={() => {
            if (!/^#[0-9A-F]{6}$/.test(customHexInput)) {
              setCustomHexInput(meta.branding.primaryColor || '#007A66')
            }
          }}
          disabled={isReadOnly}
          className="w-24 h-8 font-mono text-xs uppercase"
          placeholder="#007A66"
        />
      </div>

      {/* Text on brand surfaces */}
      <div className="space-y-2 pt-1">
        <Label className="text-sm font-medium">Button text</Label>
        <p className="text-xs text-muted-foreground">
          Color of labels and icons on brand-colored surfaces. Auto picks the more
          readable option.
        </p>

        <div
          className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1"
          role="group"
          aria-label="Button text color"
        >
          {TEXT_MODES.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setBrandTextMode(option.value)}
              disabled={isReadOnly}
              aria-pressed={textMode === option.value}
              className={cn(
                'rounded-md px-2 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                textMode === option.value
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
                isReadOnly && 'cursor-not-allowed opacity-60'
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        {/* Live contrast readout */}
        <div className="space-y-1.5">
          <ContrastRow
            sample={sampleLabel}
            label={showDarkReading ? 'Light theme' : undefined}
            background={brandColor}
            foreground={lightContrast.foreground}
            ratio={lightContrast.ratio}
            level={lightContrast.level}
          />
          {showDarkReading && (
            <ContrastRow
              sample={sampleLabel}
              label="Dark theme"
              background={generateDarkBrandPalette(brandColor, textMode).brand}
              foreground={darkContrast.foreground}
              ratio={darkContrast.ratio}
              level={darkContrast.level}
            />
          )}
        </div>

        {failing.length > 0 && (
          <div className="flex gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-2">
            <TriangleAlert className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-amber-600 dark:text-amber-500" />
            <p className="text-xs text-muted-foreground">
              Below the {AA_MINIMUM}:1 WCAG AA minimum for text. Participants may
              struggle to read button labels.{' '}
              {textMode === 'auto'
                ? 'Try a darker or lighter brand color.'
                : 'Auto would pick a more readable color, or darken the brand color to keep this one.'}
            </p>
          </div>
        )}

        {lightContrast.overridden && (
          <p className="text-xs text-muted-foreground">
            {textMode === 'light' ? 'Light' : 'Dark'} text would be invisible on this
            color, so the readable option is used instead.
          </p>
        )}
      </div>
    </div>
  )
}

interface ContrastRowProps {
  sample: string
  label?: string
  background: string
  foreground: string
  ratio: number
  level: 'AAA' | 'AA' | 'AA-large' | 'fail'
}

function ContrastRow({ sample, label, background, foreground, ratio, level }: ContrastRowProps) {
  const passes = level === 'AAA' || level === 'AA'

  return (
    <div className="flex items-center gap-2">
      <span
        className="flex h-6 max-w-[10rem] items-center truncate rounded px-2 text-[11px] font-medium ring-1 ring-inset ring-black/10"
        style={{ backgroundColor: background, color: foreground }}
      >
        {sample}
      </span>
      {label && <span className="text-xs text-muted-foreground">{label}</span>}
      <span
        className={cn(
          'font-mono text-xs',
          passes ? 'text-muted-foreground' : 'text-amber-600 dark:text-amber-500'
        )}
      >
        {ratio.toFixed(1)}:1
      </span>
      <span
        className={cn(
          'text-xs',
          passes ? 'text-muted-foreground' : 'text-amber-600 dark:text-amber-500'
        )}
      >
        {level === 'AA-large' || level === 'fail' ? 'below AA' : level}
      </span>
    </div>
  )
}
