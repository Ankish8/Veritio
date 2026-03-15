'use client'

import { memo } from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PALETTE_OPTIONS, type PaletteOption } from '@/lib/analytics'
import type { HeatmapPalette } from '@/types/analytics'

interface ColorPalettePickerProps {
  value: HeatmapPalette
  onChange: (palette: HeatmapPalette) => void
  className?: string
}

/**
 * Visual color palette selector for heatmap gradients.
 * Displays gradient previews for each palette option.
 */
export const ColorPalettePicker = memo(function ColorPalettePicker({
  value,
  onChange,
  className,
}: ColorPalettePickerProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <label className="text-sm font-medium">Color Palette</label>
      <div className="grid grid-cols-1 gap-2">
        {PALETTE_OPTIONS.map((option) => (
          <PaletteButton
            key={option.value}
            option={option}
            isSelected={value === option.value}
            onClick={() => onChange(option.value)}
          />
        ))}
      </div>
    </div>
  )
})

interface PaletteButtonProps {
  option: PaletteOption
  isSelected: boolean
  onClick: () => void
}

const PaletteButton = memo(function PaletteButton({
  option,
  isSelected,
  onClick,
}: PaletteButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 w-full p-2 rounded-lg border text-left transition-colors',
        isSelected
          ? 'border-primary bg-primary/5 ring-1 ring-primary'
          : 'border-border hover:bg-muted/50'
      )}
    >
      {/* Gradient preview */}
      <div
        className="w-16 h-4 rounded-sm shrink-0"
        style={{
          background: `linear-gradient(to right, ${option.previewColors.join(', ')})`,
        }}
      />

      {/* Label and description */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium">{option.label}</div>
        <div className="text-xs text-muted-foreground truncate">{option.description}</div>
      </div>

      {/* Check indicator */}
      {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
    </button>
  )
})
