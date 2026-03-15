import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { FrequencyCappingSettings } from '../types'
import { DEFAULT_FREQUENCY_CAPPING } from '../types'

interface FrequencyCappingPanelProps {
  frequencyCapping?: FrequencyCappingSettings
  onChange: (settings: FrequencyCappingSettings) => void
  isReadOnly?: boolean
}

export function FrequencyCappingPanel({
  frequencyCapping,
  onChange,
  isReadOnly = false,
}: FrequencyCappingPanelProps) {
  const settings = frequencyCapping || DEFAULT_FREQUENCY_CAPPING

  return (
    <div className="space-y-4 pt-4 border-t">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-0.5 flex-1 min-w-0">
          <Label>Frequency Capping</Label>
          <p className="text-xs text-muted-foreground">
            Limit how often the widget appears to the same visitor
          </p>
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
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="max-impressions" className="text-xs">Maximum Impressions</Label>
              <Input
                id="max-impressions"
                type="number"
                min={1}
                max={100}
                value={settings.maxImpressions}
                onChange={(e) =>
                  onChange({
                    ...settings,
                    maxImpressions: parseInt(e.target.value) || 1,
                  })
                }
                disabled={isReadOnly}
                placeholder="3"
                className="h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="time-window" className="text-xs">Time Window</Label>
              <Select
                value={settings.timeWindow}
                onValueChange={(value) =>
                  onChange({
                    ...settings,
                    timeWindow: value as FrequencyCappingSettings['timeWindow'],
                  })
                }
                disabled={isReadOnly}
              >
                <SelectTrigger id="time-window" className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Per Day</SelectItem>
                  <SelectItem value="week">Per Week</SelectItem>
                  <SelectItem value="month">Per Month</SelectItem>
                  <SelectItem value="forever">Forever</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="hide-after-participation"
              checked={settings.hideAfterParticipation}
              onCheckedChange={(checked) =>
                onChange({
                  ...settings,
                  hideAfterParticipation: !!checked,
                })
              }
              disabled={isReadOnly}
            />
            <Label htmlFor="hide-after-participation" className="text-sm font-normal cursor-pointer">
              Hide widget after participation
            </Label>
          </div>
        </div>
      )}
    </div>
  )
}
