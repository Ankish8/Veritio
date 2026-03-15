'use client'

import { memo } from 'react'
import { RotateCcw } from 'lucide-react'
import { STATUS_COLORS, OVERLAY_COLORS } from '@/lib/colors'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { ClickFilterControls } from './click-filter-controls'
import { cn } from '@/lib/utils'
import type { SelectionSettings, SelectionPinStyle, SelectionPinSize } from '@/types/analytics'

interface SelectionSettingsPanelProps {
  settings: SelectionSettings
  onSettingsChange: (updates: Partial<SelectionSettings>) => void
  onReset: () => void
  hasHitMissData?: boolean
  className?: string
}

/**
 * Complete settings panel for selection (click dots) visualization customization.
 * Includes pin style/size controls, display options, and click filters.
 */
export const SelectionSettingsPanel = memo(function SelectionSettingsPanel({
  settings,
  onSettingsChange,
  onReset,
  hasHitMissData = true,
  className,
}: SelectionSettingsPanelProps) {
  return (
    <div className={cn('p-4', className)}>
      {/* Header with reset button */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-muted-foreground">Customize View</span>
        <Button variant="ghost" size="sm" onClick={onReset} className="h-7 px-2 text-xs">
          <RotateCcw className="h-3 w-3 mr-1" />
          Reset
        </Button>
      </div>

      {/* Pin Style */}
      <div className="space-y-3 mb-4">
        <label className="text-sm font-medium">Pin Style</label>
        <PinStylePicker
          value={settings.pinStyle}
          onChange={(pinStyle) => onSettingsChange({ pinStyle })}
        />
      </div>

      {/* Pin Size */}
      <div className="space-y-3 mb-4">
        <label className="text-sm font-medium">Pin Size</label>
        <PinSizePicker
          value={settings.pinSize}
          onChange={(pinSize) => onSettingsChange({ pinSize })}
        />
      </div>

      {/* Overlay Opacity */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between">
          <label className="text-sm">Overlay Opacity</label>
          <span className="text-xs text-muted-foreground tabular-nums w-10 text-right">
            {Math.round(settings.overlayOpacity * 100)}%
          </span>
        </div>
        <Slider
          min={0}
          max={30}
          step={5}
          value={[Math.round(settings.overlayOpacity * 100)]}
          onValueChange={([v]) => onSettingsChange({ overlayOpacity: v / 100 })}
        />
      </div>

      <Separator className="my-4" />

      {/* Display Options */}
      <div className="space-y-3">
        <label className="text-sm font-medium">Display</label>

        <ToggleOption
          label="Show labels"
          description="Display Hit/Miss text on pins"
          checked={settings.showLabels}
          onCheckedChange={(checked) => onSettingsChange({ showLabels: checked })}
        />

        <ToggleOption
          label="Grayscale background"
          description="Desaturate image for better contrast"
          checked={settings.grayscaleBackground}
          onCheckedChange={(checked) => onSettingsChange({ grayscaleBackground: checked })}
        />
      </div>

      <Separator className="my-4" />

      {/* Click Filters (shared logic with heatmap) */}
      <ClickFilterControls
        settings={settings}
        onChange={onSettingsChange}
        hasHitMissData={hasHitMissData}
      />
    </div>
  )
})

// ============================================================================
// Sub-components
// ============================================================================

interface PinStylePickerProps {
  value: SelectionPinStyle
  onChange: (style: SelectionPinStyle) => void
}

const PIN_STYLES: { value: SelectionPinStyle; label: string; description?: string; preview: React.ReactNode }[] = [
  {
    value: 'pin',
    label: 'Pin',
    preview: (
      <svg width="16" height="22" viewBox="0 0 20 28" fill="none" className="mx-auto">
        <path d="M10 2C5.6 2 2 5.6 2 10c0 5.8 8 14.5 8 14.5s8-8.7 8-14.5c0-4.4-3.6-8-8-8z" fill={STATUS_COLORS.success} />
        <circle cx="10" cy="10" r="3" fill={OVERLAY_COLORS.white} />
      </svg>
    ),
  },
  {
    value: 'dot',
    label: 'Dot',
    preview: (
      <div className="mx-auto w-4 h-4 rounded-full bg-emerald-500 border-2 border-white shadow-sm" />
    ),
  },
  {
    value: 'response-time',
    label: 'Timed',
    description: 'Time since page load',
    preview: (
      <div className="mx-auto min-w-[28px] h-5 px-1 rounded-full bg-emerald-500 text-white text-[9px] font-bold flex items-center justify-center shadow-sm">
        1.2s
      </div>
    ),
  },
]

const PinStylePicker = memo(function PinStylePicker({ value, onChange }: PinStylePickerProps) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {PIN_STYLES.map((style) => {
        const button = (
          <button
            key={style.value}
            onClick={() => onChange(style.value)}
            className={cn(
              'flex flex-col items-center gap-1.5 p-2 rounded-lg border transition-colors',
              value === style.value
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50'
            )}
          >
            <div className="h-6 flex items-end justify-center">{style.preview}</div>
            <span className="text-xs">{style.label}</span>
          </button>
        )

        // Wrap with tooltip if description exists
        if (style.description) {
          return (
            <TooltipProvider key={style.value}>
              <Tooltip>
                <TooltipTrigger asChild>{button}</TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  {style.description}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )
        }

        return button
      })}
    </div>
  )
})

interface PinSizePickerProps {
  value: SelectionPinSize
  onChange: (size: SelectionPinSize) => void
}

const PIN_SIZES: { value: SelectionPinSize; label: string }[] = [
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
]

const PinSizePicker = memo(function PinSizePicker({ value, onChange }: PinSizePickerProps) {
  return (
    <div className="flex gap-2">
      {PIN_SIZES.map((size) => (
        <button
          key={size.value}
          onClick={() => onChange(size.value)}
          className={cn(
            'flex-1 py-1.5 px-3 rounded-md border text-sm transition-colors',
            value === size.value
              ? 'border-primary bg-primary/5 text-primary'
              : 'border-border hover:border-primary/50'
          )}
        >
          {size.label}
        </button>
      ))}
    </div>
  )
})

interface ToggleOptionProps {
  label: string
  description: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}

const ToggleOption = memo(function ToggleOption({
  label,
  description,
  checked,
  onCheckedChange,
}: ToggleOptionProps) {
  return (
    <label className="flex items-center justify-between gap-3 cursor-pointer">
      <div className="flex-1 min-w-0">
        <div className="text-sm">{label}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
      <Switch size="sm" checked={checked} onCheckedChange={onCheckedChange} />
    </label>
  )
})
