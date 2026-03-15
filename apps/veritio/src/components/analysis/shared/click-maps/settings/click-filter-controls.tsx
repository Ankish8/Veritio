'use client'

import { memo } from 'react'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'

/**
 * Common filter fields shared between HeatmapSettings and SelectionSettings
 */
interface ClickFilterFields {
  showFirstClickOnly: boolean
  showHitsOnly: boolean
  showMissesOnly: boolean
}

/**
 * Partial updates specifically for click filter fields
 */
type ClickFilterUpdates = Partial<ClickFilterFields>

interface ClickFilterControlsProps {
  settings: ClickFilterFields
  onChange: (updates: ClickFilterUpdates) => void
  hasHitMissData?: boolean // Only show hit/miss filters when relevant
  className?: string
}

/**
 * Click filter toggles for heatmap/selection visualization.
 * Allows filtering to show only first clicks, hits, or misses.
 *
 * Note: showHitsOnly and showMissesOnly are mutually exclusive.
 * Works with both HeatmapSettings and SelectionSettings.
 */
export const ClickFilterControls = memo(function ClickFilterControls({
  settings,
  onChange,
  hasHitMissData = true,
  className,
}: ClickFilterControlsProps) {
  return (
    <div className={cn('space-y-3', className)}>
      <label className="text-sm font-medium">Filters</label>

      {/* First Click Only */}
      <FilterToggle
        label="First click only"
        description="Show only the first click per participant"
        checked={settings.showFirstClickOnly}
        onCheckedChange={(checked) => onChange({ showFirstClickOnly: checked })}
      />

      {/* Hit/Miss filters - only show when data supports it */}
      {hasHitMissData && (
        <>
          <FilterToggle
            label="Show hits only"
            description="Clicks on interactive areas"
            checked={settings.showHitsOnly}
            onCheckedChange={(checked) =>
              onChange({
                showHitsOnly: checked,
                // Clear misses filter when enabling hits
                showMissesOnly: checked ? false : settings.showMissesOnly,
              })
            }
          />

          <FilterToggle
            label="Show misses only"
            description="Clicks on non-interactive areas"
            checked={settings.showMissesOnly}
            onCheckedChange={(checked) =>
              onChange({
                showMissesOnly: checked,
                // Clear hits filter when enabling misses
                showHitsOnly: checked ? false : settings.showHitsOnly,
              })
            }
          />
        </>
      )}
    </div>
  )
})

interface FilterToggleProps {
  label: string
  description: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}

const FilterToggle = memo(function FilterToggle({
  label,
  description,
  checked,
  onCheckedChange,
}: FilterToggleProps) {
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
