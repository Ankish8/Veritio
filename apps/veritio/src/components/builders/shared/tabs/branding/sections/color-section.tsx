'use client'

import { useState, useEffect } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Check } from 'lucide-react'
import { useStudyMetaStore } from '@/stores/study-meta-store'
import { generateBrandPalette } from '@/lib/brand-colors'
import { COLOR_PRESETS } from '../constants'
import { cn } from '@/lib/utils'

interface ColorSectionProps {
  studyId: string
  isReadOnly?: boolean
}

export function ColorSection({ studyId: _studyId, isReadOnly }: ColorSectionProps) {
  const { meta, setPrimaryColor } = useStudyMetaStore()
  const [customHexInput, setCustomHexInput] = useState(meta.branding.primaryColor || '#007A66')

  // Sync custom hex input when primary color changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCustomHexInput(meta.branding.primaryColor || '#007A66')
  }, [meta.branding.primaryColor])

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
    </div>
  )
}
