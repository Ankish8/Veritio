'use client'

import { Label } from '@veritio/ui'
import { Switch } from '@veritio/ui'

interface ToggleOptionRowProps {
  id: string
  label: string
  description?: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}
export function ToggleOptionRow({
  id,
  label,
  description,
  checked,
  onCheckedChange,
}: ToggleOptionRowProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="space-y-0.5">
        <Label htmlFor={id} className="text-sm">{label}</Label>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  )
}
