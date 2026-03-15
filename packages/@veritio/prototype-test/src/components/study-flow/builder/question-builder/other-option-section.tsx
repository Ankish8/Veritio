'use client'

import { Label } from '@veritio/ui'
import { Input } from '@veritio/ui'
import { Switch } from '@veritio/ui'

interface OtherOptionSectionProps {
  allowOther: boolean
  otherLabel: string
  onAllowOtherChange: (checked: boolean) => void
  onOtherLabelChange: (label: string) => void
}
export function OtherOptionSection({
  allowOther,
  otherLabel,
  onAllowOtherChange,
  onOtherLabelChange,
}: OtherOptionSectionProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <Label htmlFor="allow-other">Allow &quot;Other&quot;</Label>
          <p className="text-xs text-muted-foreground">
            Let participants enter a custom answer
          </p>
        </div>
        <Switch
          id="allow-other"
          checked={allowOther}
          onCheckedChange={onAllowOtherChange}
        />
      </div>

      {allowOther && (
        <div className="space-y-2 ml-4">
          <Label htmlFor="other-label">&quot;Other&quot; Label</Label>
          <Input
            id="other-label"
            value={otherLabel}
            onChange={(e) => onOtherLabelChange(e.target.value)}
            placeholder="Other (please specify)"
          />
        </div>
      )}
    </div>
  )
}
