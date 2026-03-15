'use client'

import { memo } from 'react'
import { RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { ColorPalettePicker } from './color-palette-picker'
import { ClickFilterControls } from './click-filter-controls'
import type { HeatmapSettings } from '@/types/analytics'

interface HeatmapSettingsPanelProps {
  settings: HeatmapSettings
  onSettingsChange: (updates: Partial<HeatmapSettings>) => void
  onReset: () => void
  hasHitMissData?: boolean // Show hit/miss filters only when relevant
  className?: string
}

/**
 * Complete settings panel for heatmap visualization customization.
 * Includes visualization controls, color palette, and click filters.
 */
export const HeatmapSettingsPanel = memo(function HeatmapSettingsPanel({
  settings,
  onSettingsChange,
  onReset,
  hasHitMissData = true,
  className,
}: HeatmapSettingsPanelProps) {
  return (
    <div className={`p-4 ${className ?? ''}`}>
      {/* Header with reset button */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-muted-foreground">Customize View</span>
        <Button variant="ghost" size="sm" onClick={onReset} className="h-7 px-2 text-xs">
          <RotateCcw className="h-3 w-3 mr-1" />
          Reset
        </Button>
      </div>

      {/* Visualization Controls */}
      <div className="space-y-4">
        {/* Radius */}
        <SliderControl
          label="Radius"
          value={settings.radius}
          min={10}
          max={50}
          step={1}
          onChange={(value) => onSettingsChange({ radius: value })}
          formatValue={(v) => `${v}px`}
        />

        {/* Opacity */}
        <SliderControl
          label="Opacity"
          value={Math.round(settings.opacity * 100)}
          min={30}
          max={100}
          step={5}
          onChange={(value) => onSettingsChange({ opacity: value / 100 })}
          formatValue={(v) => `${v}%`}
        />

        {/* Blur */}
        <SliderControl
          label="Blur"
          value={Math.round(settings.blur * 100)}
          min={50}
          max={100}
          step={5}
          onChange={(value) => onSettingsChange({ blur: value / 100 })}
          formatValue={(v) => `${v}%`}
        />
      </div>

      <Separator className="my-4" />

      {/* Color Palette */}
      <ColorPalettePicker
        value={settings.palette}
        onChange={(palette) => onSettingsChange({ palette })}
      />

      <Separator className="my-4" />

      {/* Click Filters */}
      <ClickFilterControls
        settings={settings}
        onChange={onSettingsChange}
        hasHitMissData={hasHitMissData}
      />

      <Separator className="my-4" />

      {/* Background Options */}
      <div className="space-y-3">
        <label className="text-sm font-medium">Display</label>
        <label className="flex items-center justify-between gap-3 cursor-pointer">
          <div className="flex-1 min-w-0">
            <div className="text-sm">Grayscale background</div>
            <div className="text-xs text-muted-foreground">Desaturate image for better contrast</div>
          </div>
          <Switch
            size="sm"
            checked={settings.grayscaleBackground}
            onCheckedChange={(checked) => onSettingsChange({ grayscaleBackground: checked })}
          />
        </label>
      </div>
    </div>
  )
})

interface SliderControlProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (value: number) => void
  formatValue: (value: number) => string
}

const SliderControl = memo(function SliderControl({
  label,
  value,
  min,
  max,
  step,
  onChange,
  formatValue,
}: SliderControlProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm">{label}</label>
        <span className="text-xs text-muted-foreground tabular-nums w-10 text-right">
          {formatValue(value)}
        </span>
      </div>
      <Slider
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={([v]) => onChange(v)}
      />
    </div>
  )
})
