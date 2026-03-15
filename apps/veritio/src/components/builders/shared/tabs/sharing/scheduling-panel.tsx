import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar, Info } from 'lucide-react'
import type { SchedulingSettings, TimezoneMode } from '../../types'
import { DEFAULT_SCHEDULING } from '../../types'

interface SchedulingPanelProps {
  scheduling?: SchedulingSettings
  onChange: (settings: SchedulingSettings) => void
  isReadOnly?: boolean
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sun', fullLabel: 'Sunday' },
  { value: 1, label: 'Mon', fullLabel: 'Monday' },
  { value: 2, label: 'Tue', fullLabel: 'Tuesday' },
  { value: 3, label: 'Wed', fullLabel: 'Wednesday' },
  { value: 4, label: 'Thu', fullLabel: 'Thursday' },
  { value: 5, label: 'Fri', fullLabel: 'Friday' },
  { value: 6, label: 'Sat', fullLabel: 'Saturday' },
]

export function SchedulingPanel({
  scheduling,
  onChange,
  isReadOnly = false,
}: SchedulingPanelProps) {
  const settings = scheduling || DEFAULT_SCHEDULING

  const toggleDay = (day: number) => {
    const current = settings.daysOfWeek || []
    const updated = current.includes(day)
      ? current.filter((d) => d !== day)
      : [...current, day].sort()

    onChange({
      ...settings,
      daysOfWeek: updated,
    })
  }

  return (
    <div className="space-y-4 pt-4 border-t">
      {/* Header with Enable Toggle */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div className="space-y-0.5 flex-1 min-w-0">
            <Label>Smart Scheduling</Label>
            <p className="text-xs text-muted-foreground">
              Control when the widget appears to visitors
            </p>
          </div>
        </div>
        <Switch
          checked={settings.enabled}
          onCheckedChange={(enabled) =>
            onChange({
              ...settings,
              enabled,
            })
          }
          disabled={isReadOnly}
          className="flex-shrink-0"
        />
      </div>

      {settings.enabled && (
        <div className="space-y-3 pl-4 border-l-2 border-muted">
          {/* Business Hours */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-0.5 flex-1 min-w-0">
                <Label>Business Hours Only</Label>
                <p className="text-xs text-muted-foreground">
                  Show widget during specific hours only
                </p>
              </div>
              <Switch
                checked={settings.businessHoursOnly}
                onCheckedChange={(checked) =>
                  onChange({
                    ...settings,
                    businessHoursOnly: checked,
                  })
                }
                disabled={isReadOnly}
                className="flex-shrink-0"
              />
            </div>

            {settings.businessHoursOnly && (
              <div className="grid grid-cols-2 gap-3 pl-4">
                <div className="space-y-1.5">
                  <Label htmlFor="start-time" className="text-xs">Start Time</Label>
                  <Input
                    id="start-time"
                    type="time"
                    value={settings.businessHours.start}
                    onChange={(e) =>
                      onChange({
                        ...settings,
                        businessHours: {
                          ...settings.businessHours,
                          start: e.target.value,
                        },
                      })
                    }
                    disabled={isReadOnly}
                    className="h-9"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="end-time" className="text-xs">End Time</Label>
                  <Input
                    id="end-time"
                    type="time"
                    value={settings.businessHours.end}
                    onChange={(e) =>
                      onChange({
                        ...settings,
                        businessHours: {
                          ...settings.businessHours,
                          end: e.target.value,
                        },
                      })
                    }
                    disabled={isReadOnly}
                    className="h-9"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Days of Week */}
          <div className="space-y-3">
            <div className="space-y-0.5">
              <Label>Days of Week</Label>
              <p className="text-xs text-muted-foreground">
                Select specific days to show widget (empty = all days)
              </p>
            </div>

            <div className="flex gap-1.5">
              {DAYS_OF_WEEK.map((day) => (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => toggleDay(day.value)}
                  disabled={isReadOnly}
                  className={`
                    flex-1 px-2 py-2 rounded-md text-sm font-medium transition-colors
                    ${
                      settings.daysOfWeek.includes(day.value)
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted hover:bg-muted/80'
                    }
                    ${isReadOnly ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  `}
                  title={day.fullLabel}
                >
                  {day.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date Range */}
          <div className="space-y-3">
            <div className="space-y-0.5">
              <Label>Campaign Date Range</Label>
              <p className="text-xs text-muted-foreground">
                Limit widget to specific date range (optional)
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="start-date" className="text-xs">Start Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={settings.dateRange.start || ''}
                  onChange={(e) =>
                    onChange({
                      ...settings,
                      dateRange: {
                        ...settings.dateRange,
                        start: e.target.value,
                      },
                    })
                  }
                  disabled={isReadOnly}
                  className="h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="end-date" className="text-xs">End Date</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={settings.dateRange.end || ''}
                  onChange={(e) =>
                    onChange({
                      ...settings,
                      dateRange: {
                        ...settings.dateRange,
                        end: e.target.value,
                      },
                    })
                  }
                  disabled={isReadOnly}
                  className="h-9"
                />
              </div>
            </div>
          </div>

          {/* Timezone */}
          <div className="space-y-3">
            <div className="space-y-0.5">
              <Label>Timezone Handling</Label>
              <p className="text-xs text-muted-foreground">
                How to interpret scheduled times
              </p>
            </div>

            <Select
              value={settings.timezone}
              onValueChange={(value) =>
                onChange({
                  ...settings,
                  timezone: value as TimezoneMode,
                })
              }
              disabled={isReadOnly}
            >
              <SelectTrigger className="h-9 min-w-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User's Local Timezone (Recommended)</SelectItem>
                <SelectItem value="fixed">Fixed Timezone</SelectItem>
              </SelectContent>
            </Select>

            {settings.timezone === 'fixed' && (
              <div className="space-y-1.5 pl-4">
                <Label htmlFor="fixed-timezone" className="text-xs">IANA Timezone</Label>
                <Input
                  id="fixed-timezone"
                  value={settings.fixedTimezone || ''}
                  onChange={(e) =>
                    onChange({
                      ...settings,
                      fixedTimezone: e.target.value,
                    })
                  }
                  disabled={isReadOnly}
                  placeholder="America/New_York"
                  className="h-9"
                />
                <p className="text-xs text-muted-foreground">
                  Examples: America/New_York, Europe/London, Asia/Tokyo
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Info Note */}
      {settings.enabled && (
        <div className="rounded-md bg-blue-50 border border-blue-200 p-3 flex items-start gap-2">
          <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-blue-800">
            Scheduling helps you show the widget at optimal times for your target audience. All
            schedule checks happen client-side using the visitor's browser time.
          </p>
        </div>
      )}
    </div>
  )
}
