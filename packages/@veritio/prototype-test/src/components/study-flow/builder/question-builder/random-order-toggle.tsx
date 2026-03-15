'use client'

import { Label } from '@veritio/ui'
import { Switch } from '@veritio/ui'

interface RandomOrderToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  description?: string
  id?: string
}
export function RandomOrderToggle({
  checked,
  onChange,
  label = 'Randomize Order',
  description = 'Show options in random order for each participant',
  id = 'random-order',
}: RandomOrderToggleProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <Label htmlFor={id}>{label}</Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  )
}
