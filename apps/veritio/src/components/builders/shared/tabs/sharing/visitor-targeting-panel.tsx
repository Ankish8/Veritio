import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Info } from 'lucide-react'
import type { TargetingSettings } from '../../types'
import { DEFAULT_TARGETING } from '../../types'

interface VisitorTargetingPanelProps {
  targeting?: TargetingSettings
  onChange: (settings: TargetingSettings) => void
  isReadOnly?: boolean
}

export function VisitorTargetingPanel({
  targeting,
  onChange,
  isReadOnly = false,
}: VisitorTargetingPanelProps) {
  const settings = targeting || DEFAULT_TARGETING

  // Warn if both new and returning are selected (cancels out)
  const showConflictWarning = settings.newVisitors && settings.returningVisitors

  return (
    <div className="space-y-3 pt-4 border-t">
      <div className="space-y-0.5">
        <Label>Visitor Targeting</Label>
        <p className="text-xs text-muted-foreground">
          Control which visitors see the widget
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="target-new"
            checked={settings.newVisitors}
            onCheckedChange={(checked) =>
              onChange({
                ...settings,
                newVisitors: !!checked,
              })
            }
            disabled={isReadOnly}
          />
          <Label htmlFor="target-new" className="text-sm font-normal cursor-pointer">
            Show to new visitors only
          </Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="target-returning"
            checked={settings.returningVisitors}
            onCheckedChange={(checked) =>
              onChange({
                ...settings,
                returningVisitors: !!checked,
              })
            }
            disabled={isReadOnly}
          />
          <Label htmlFor="target-returning" className="text-sm font-normal cursor-pointer">
            Show to returning visitors only
          </Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="exclude-participants"
            checked={settings.excludeParticipants}
            onCheckedChange={(checked) =>
              onChange({
                ...settings,
                excludeParticipants: !!checked,
              })
            }
            disabled={isReadOnly}
          />
          <Label htmlFor="exclude-participants" className="text-sm font-normal cursor-pointer">
            Exclude users who already participated
          </Label>
        </div>
      </div>

      {showConflictWarning && (
        <div className="rounded-md bg-amber-50 border border-amber-200 p-2 flex items-start gap-2">
          <Info className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-amber-800">
            Both "new" and "returning" are selected, so all visitors will see the widget (same as
            neither selected).
          </p>
        </div>
      )}
    </div>
  )
}
