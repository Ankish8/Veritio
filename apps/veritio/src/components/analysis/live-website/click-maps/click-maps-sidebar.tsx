'use client'

import { useState, memo } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  ChevronDown,
  ChevronRight,
  Download,
} from 'lucide-react'
import type { HeatmapSettings, SelectionSettings } from '@/types/analytics'

type DisplayMode = 'heatmap' | 'selection'
type DeviceType = 'all' | 'desktop' | 'tablet' | 'mobile'

export interface PageWithStats {
  pageUrl: string
  screenshotPath: string | null
  snapshotPath: string | null
  viewportWidth: number
  viewportHeight: number
  pageWidth: number
  totalClicks: number
  uniqueVisitors: number
  variantName?: string
}

interface ClickMapsSidebarProps {
  displayMode: DisplayMode
  onDisplayModeChange: (mode: DisplayMode) => void
  selectedDevice: DeviceType
  onDeviceChange: (device: DeviceType) => void
  showDeviceFilter: boolean
  totalClicks: number
  uniqueParticipants: number
  modalClicks?: number
  onDownloadPNG: () => void
  heatmapSettings: HeatmapSettings
  onHeatmapSettingsChange: (updates: Partial<HeatmapSettings>) => void
  selectionSettings: SelectionSettings
  onSelectionSettingsChange: (updates: Partial<SelectionSettings>) => void
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  formatValue,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  formatValue?: (v: number) => string
  onChange: (v: number) => void
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="text-sm tabular-nums font-medium">
          {formatValue ? formatValue(value) : value}
        </span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={([v]) => onChange(v)}
      />
    </div>
  )
}

function CheckboxRow({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <Checkbox
        checked={checked}
        onCheckedChange={onChange}
      />
      <Label className="text-sm font-normal cursor-pointer">{label}</Label>
    </div>
  )
}

function ClickMapsSidebarBase({
  displayMode,
  onDisplayModeChange,
  selectedDevice,
  onDeviceChange,
  showDeviceFilter,
  totalClicks,
  uniqueParticipants,
  modalClicks = 0,
  onDownloadPNG,
  heatmapSettings,
  onHeatmapSettingsChange,
  selectionSettings,
  onSelectionSettingsChange,
}: ClickMapsSidebarProps) {
  const [open, setOpen] = useState(true)

  return (
    <div className="w-full lg:w-60 lg:shrink-0 lg:sticky lg:top-[120px] space-y-3 lg:max-h-[calc(100vh-140px)] lg:overflow-y-auto">
      {/* Controls Section */}
      <div className="border rounded-lg overflow-hidden">
        <button
          onClick={() => setOpen(!open)}
          className="w-full flex items-center justify-between p-3 text-sm font-medium hover:bg-muted/30 transition-colors"
        >
          <div className="flex items-center gap-2">
            {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            <span>Controls</span>
          </div>
        </button>
        {open && (
          <div className="border-t p-3 space-y-3">
            {/* View + Device dropdowns */}
            <div className="flex items-center justify-between gap-3">
              <label className="text-sm text-muted-foreground shrink-0">View</label>
              <Select value={displayMode} onValueChange={v => onDisplayModeChange(v as DisplayMode)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="heatmap">Heatmap</SelectItem>
                  <SelectItem value="selection">Selection</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {showDeviceFilter && (
              <div className="flex items-center justify-between gap-3">
                <label className="text-sm text-muted-foreground shrink-0">Device</label>
                <Select value={selectedDevice} onValueChange={v => onDeviceChange(v as DeviceType)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All devices</SelectItem>
                    <SelectItem value="desktop">Desktop</SelectItem>
                    <SelectItem value="tablet">Tablet</SelectItem>
                    <SelectItem value="mobile">Mobile</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <Separator />

            {/* Mode-specific settings */}
            {displayMode === 'heatmap' ? (
              <div className="space-y-3">
                <SliderRow
                  label="Radius"
                  value={heatmapSettings.radius}
                  min={10}
                  max={50}
                  step={1}
                  formatValue={v => `${v}px`}
                  onChange={v => onHeatmapSettingsChange({ radius: v })}
                />
                <SliderRow
                  label="Opacity"
                  value={heatmapSettings.opacity}
                  min={0.3}
                  max={1}
                  step={0.05}
                  formatValue={v => `${Math.round(v * 100)}%`}
                  onChange={v => onHeatmapSettingsChange({ opacity: v })}
                />
                <SliderRow
                  label="Blur"
                  value={heatmapSettings.blur}
                  min={0.5}
                  max={1}
                  step={0.05}
                  formatValue={v => `${Math.round(v * 100)}%`}
                  onChange={v => onHeatmapSettingsChange({ blur: v })}
                />

                <Separator />

                <div className="space-y-2">
                  <CheckboxRow
                    label="Hits only"
                    checked={heatmapSettings.showHitsOnly}
                    onChange={v => onHeatmapSettingsChange({ showHitsOnly: !!v })}
                  />
                  <CheckboxRow
                    label="Misses only"
                    checked={heatmapSettings.showMissesOnly}
                    onChange={v => onHeatmapSettingsChange({ showMissesOnly: !!v })}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-muted-foreground">Pin style</span>
                  <Select value={selectionSettings.pinStyle} onValueChange={v => onSelectionSettingsChange({ pinStyle: v as SelectionSettings['pinStyle'] })}>
                    <SelectTrigger className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pin">Pin</SelectItem>
                      <SelectItem value="dot">Dot</SelectItem>
                      <SelectItem value="response-time">Response time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="space-y-2">
                  <CheckboxRow
                    label="Hits only"
                    checked={selectionSettings.showHitsOnly}
                    onChange={v => onSelectionSettingsChange({ showHitsOnly: !!v })}
                  />
                  <CheckboxRow
                    label="Misses only"
                    checked={selectionSettings.showMissesOnly}
                    onChange={v => onSelectionSettingsChange({ showMissesOnly: !!v })}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer: Stats + Download */}
      <div className="space-y-2">
        <div className="text-sm text-muted-foreground px-1">
          {totalClicks} click{totalClicks !== 1 ? 's' : ''} · {uniqueParticipants} participant{uniqueParticipants !== 1 ? 's' : ''}
          {modalClicks > 0 && (
            <div className="text-xs text-muted-foreground/70 mt-0.5">
              {modalClicks} modal click{modalClicks !== 1 ? 's' : ''} not shown on map
            </div>
          )}
        </div>
        <Button variant="outline" className="w-full" onClick={onDownloadPNG}>
          <Download className="h-4 w-4 mr-2" />
          Download clickmap
        </Button>
      </div>
    </div>
  )
}

export const ClickMapsSidebar = memo(ClickMapsSidebarBase)
