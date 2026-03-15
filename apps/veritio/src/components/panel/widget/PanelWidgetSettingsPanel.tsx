'use client'

import { ScrollArea } from '@/components/ui/scroll-area'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { Info } from 'lucide-react'

import { AdvancedTriggerBuilder } from '@/components/builders/shared/tabs/sharing/advanced-trigger-builder'
import {
  SettingRow,
  CheckboxRow,
  Divider,
  DAYS_OF_WEEK,
  DEFAULT_TARGETING,
  DEFAULT_SCHEDULING,
} from './settings-panel-helpers'
import { CopyPersonalizationBuilder } from './copy-personalization-builder'

import type {
  PanelWidgetConfigData,
  WidgetTargetingSettings,
  WidgetSchedulingSettings,
  WidgetAdvancedTriggers,
  WidgetPlacementSettings,
  WidgetCopyPersonalization,
} from '@/lib/supabase/panel-types'

function InfoTip({ children }: { children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" className="text-muted-foreground hover:text-foreground transition-colors">
          <Info className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[240px]">
        {children}
      </TooltipContent>
    </Tooltip>
  )
}

function LabelWithInfo({ children, tooltip }: { children: React.ReactNode; tooltip: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5">
      <Label className="text-sm">{children}</Label>
      <InfoTip>{tooltip}</InfoTip>
    </div>
  )
}

export interface WidgetExtendedSettings {
  targeting?: WidgetTargetingSettings
  scheduling?: WidgetSchedulingSettings
  advancedTriggers?: WidgetAdvancedTriggers
  placement?: WidgetPlacementSettings
  copyPersonalization?: WidgetCopyPersonalization
}

interface PanelWidgetSettingsPanelProps {
  config: PanelWidgetConfigData
  onConfigChange: (updates: Partial<PanelWidgetConfigData>) => void
  /** @deprecated - Extended settings are now part of config */
  extendedSettings?: WidgetExtendedSettings
  /** @deprecated - Use onConfigChange instead */
  onExtendedSettingsChange?: (updates: Partial<WidgetExtendedSettings>) => void
}

export function PanelWidgetSettingsPanel({
  config,
  onConfigChange,
}: PanelWidgetSettingsPanelProps) {
  // Read extended settings directly from config (now persisted to database)
  const targeting = config.targeting ?? DEFAULT_TARGETING
  const scheduling = config.scheduling ?? DEFAULT_SCHEDULING

  // Save extended settings directly to config (persisted to database)
  const handleTargetingChange = (updates: Partial<WidgetTargetingSettings>) => {
    onConfigChange({ targeting: { ...targeting, ...updates } })
  }

  const handleSchedulingChange = (updates: Partial<WidgetSchedulingSettings>) => {
    onConfigChange({ scheduling: { ...scheduling, ...updates } })
  }

  const toggleDay = (day: number) => {
    const current = scheduling.daysOfWeek || []
    const updated = current.includes(day)
      ? current.filter((d) => d !== day)
      : [...current, day].sort((a, b) => a - b)
    handleSchedulingChange({ daysOfWeek: updated })
  }

  return (
    <ScrollArea className="flex-1">
      <div className="p-4 space-y-4">
        {/* Frequency Capping */}
        <SettingRow
          label={
            <div className="flex items-center gap-1.5">
              <span>Frequency Capping</span>
              <InfoTip>
                Prevents showing the widget too often to the same visitor. Uses browser cookies to track impressions.
              </InfoTip>
            </div>
          }
          description="Limit impressions per visitor"
        >
          <Switch
            checked={config.frequencyCapping?.enabled ?? false}
            onCheckedChange={(checked) =>
              onConfigChange({ frequencyCapping: { ...config.frequencyCapping, enabled: checked } })
            }
          />
        </SettingRow>

        {config.frequencyCapping?.enabled && (
          <div className="flex items-center gap-2 mt-2">
            <span className="text-sm text-muted-foreground">Show max</span>
            <Input
              type="number"
              min={1}
              max={100}
              value={config.frequencyCapping.maxImpressions}
              onChange={(e) =>
                onConfigChange({
                  frequencyCapping: {
                    ...config.frequencyCapping,
                    maxImpressions: parseInt(e.target.value) || 1,
                  },
                })
              }
              className="w-16 h-9"
            />
            <span className="text-sm text-muted-foreground">times per</span>
            <Select
              value={config.frequencyCapping.timeWindow}
              onValueChange={(value: 'day' | 'week' | 'month' | 'forever') =>
                onConfigChange({ frequencyCapping: { ...config.frequencyCapping, timeWindow: value } })
              }
            >
              <SelectTrigger className="w-24 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">day</SelectItem>
                <SelectItem value="week">week</SelectItem>
                <SelectItem value="month">month</SelectItem>
                <SelectItem value="forever">ever</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <Divider />

        {/* Visitor Targeting */}
        <div className="space-y-3">
          <div className="flex items-center gap-1.5">
            <Label className="font-medium">Visitor Targeting</Label>
            <InfoTip>
              Filter which visitors see the widget based on their visit history. Uses cookies to identify returning visitors.
            </InfoTip>
          </div>
          <div className="space-y-2">
            <CheckboxRow
              id="target-new"
              label="New visitors only"
              checked={targeting.newVisitors}
              onCheckedChange={(checked) => handleTargetingChange({ newVisitors: !!checked })}
            />
            <CheckboxRow
              id="target-returning"
              label="Returning visitors only"
              checked={targeting.returningVisitors}
              onCheckedChange={(checked) => handleTargetingChange({ returningVisitors: !!checked })}
            />
            <CheckboxRow
              id="exclude-participants"
              label="Exclude previous participants"
              checked={targeting.excludeParticipants}
              onCheckedChange={(checked) => handleTargetingChange({ excludeParticipants: !!checked })}
            />
          </div>
        </div>

        <Divider />

        {/* Scheduling */}
        <SettingRow
          label={
            <div className="flex items-center gap-1.5">
              <span>Scheduling</span>
              <InfoTip>
                Restrict when the widget appears based on time, days, or date ranges. Uses the visitor's local timezone.
              </InfoTip>
            </div>
          }
          description="Control when widget appears"
        >
          <Switch
            checked={scheduling.enabled}
            onCheckedChange={(enabled) => handleSchedulingChange({ enabled })}
          />
        </SettingRow>

        {scheduling.enabled && (
          <div className="space-y-4 mt-3">
            <SettingRow label="Business hours only">
              <Switch
                checked={scheduling.businessHoursOnly}
                onCheckedChange={(checked) => handleSchedulingChange({ businessHoursOnly: checked })}
              />
            </SettingRow>

            {scheduling.businessHoursOnly && (
              <div className="flex items-center gap-2">
                <Input
                  type="time"
                  value={scheduling.businessHours.start}
                  onChange={(e) =>
                    handleSchedulingChange({
                      businessHours: { ...scheduling.businessHours, start: e.target.value },
                    })
                  }
                  className="w-24 h-9 [&::-webkit-calendar-picker-indicator]:hidden"
                />
                <span className="text-sm text-muted-foreground px-1">to</span>
                <Input
                  type="time"
                  value={scheduling.businessHours.end}
                  onChange={(e) =>
                    handleSchedulingChange({
                      businessHours: { ...scheduling.businessHours, end: e.target.value },
                    })
                  }
                  className="w-24 h-9 [&::-webkit-calendar-picker-indicator]:hidden"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-sm">Active days</Label>
              <div className="flex gap-1">
                {DAYS_OF_WEEK.map((day) => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleDay(day.value)}
                    className={cn(
                      'w-8 h-8 rounded-md text-sm font-medium transition-colors',
                      scheduling.daysOfWeek.includes(day.value)
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted hover:bg-muted/80'
                    )}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Campaign dates</Label>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-10">Start</span>
                  <Input
                    type="date"
                    value={scheduling.dateRange.start || ''}
                    onChange={(e) =>
                      handleSchedulingChange({
                        dateRange: { ...scheduling.dateRange, start: e.target.value || undefined },
                      })
                    }
                    className="flex-1 h-9"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-10">End</span>
                  <Input
                    type="date"
                    value={scheduling.dateRange.end || ''}
                    onChange={(e) =>
                      handleSchedulingChange({
                        dateRange: { ...scheduling.dateRange, end: e.target.value || undefined },
                      })
                    }
                    className="flex-1 h-9"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        <Divider />

        {/* Advanced Triggers */}
        <AdvancedTriggerBuilder
          advancedTriggers={config.advancedTriggers}
          onChange={(updated) => onConfigChange({ advancedTriggers: updated })}
          isReadOnly={false}
          hideHeader
        />

        <Divider />

        {/* Copy Personalization */}
        <SettingRow
          label={
            <div className="flex items-center gap-1.5">
              <span>Copy Personalization</span>
              <InfoTip>
                <div className="space-y-1">
                  <p className="font-medium">Dynamic text based on context</p>
                  <p>Use variables like {'{{page_title}}'} or {'{{referrer}}'} in your widget copy.</p>
                  <p className="text-muted-foreground">Example: "Welcome from {'{{referrer}}'}!"</p>
                </div>
              </InfoTip>
            </div>
          }
          description="Adapt messaging by context"
        >
          <Switch
            checked={config.copyPersonalization?.enabled ?? false}
            onCheckedChange={(checked) =>
              onConfigChange({
                copyPersonalization: {
                  ...config.copyPersonalization,
                  enabled: checked,
                  variables: config.copyPersonalization?.variables || { enabled: false },
                  rules: config.copyPersonalization?.rules || [],
                },
              })
            }
          />
        </SettingRow>

        {config.copyPersonalization?.enabled && (
          <CopyPersonalizationBuilder
            config={config.copyPersonalization}
            onChange={(copyPersonalization) => onConfigChange({ copyPersonalization })}
          />
        )}

        <Divider />

        {/* Placement Mode */}
        <div className="space-y-2">
          <LabelWithInfo
            tooltip={
              <div className="space-y-2">
                <p className="font-medium">How the widget appears on the page:</p>
                <ul className="space-y-1 text-xs">
                  <li><strong>Fixed Corners:</strong> Floats in a corner of the screen (default)</li>
                  <li><strong>Inline:</strong> Embeds inside a specific element on the page</li>
                  <li><strong>Sticky:</strong> Sticks to top or bottom of viewport while scrolling</li>
                  <li><strong>After Element:</strong> Inserts after a specific page element</li>
                </ul>
              </div>
            }
          >
            Placement Mode
          </LabelWithInfo>
          <Select
            value={config.placement?.mode || 'fixed'}
            onValueChange={(value) =>
              onConfigChange({
                placement: { ...config.placement, mode: value as WidgetPlacementSettings['mode'] },
              })
            }
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fixed">Fixed Corners</SelectItem>
              <SelectItem value="inline">Inline</SelectItem>
              <SelectItem value="sticky">Sticky</SelectItem>
              <SelectItem value="after_element">After Element</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Show CSS selector input for inline and after_element modes */}
        {(config.placement?.mode === 'inline' || config.placement?.mode === 'after_element') && (
          <div className="space-y-2">
            <LabelWithInfo
              tooltip={
                <div className="space-y-1">
                  <p>CSS selector to target the element on your page.</p>
                  <p className="text-muted-foreground">Examples: #my-id, .my-class, [data-widget]</p>
                </div>
              }
            >
              CSS Selector
            </LabelWithInfo>
            <Input
              value={config.placement?.cssSelector || ''}
              onChange={(e) =>
                onConfigChange({
                  placement: { ...config.placement, mode: config.placement?.mode || 'inline', cssSelector: e.target.value },
                })
              }
              placeholder="#my-element or .my-class"
              className="h-9"
            />
          </div>
        )}
      </div>
    </ScrollArea>
  )
}
