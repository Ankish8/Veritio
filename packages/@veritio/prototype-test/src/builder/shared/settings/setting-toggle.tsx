'use client'

import { Switch } from '@veritio/ui'
import { SettingField } from './setting-field'

export interface SettingToggleProps {
  id: string
  label: string
  description?: string
  tooltip?: string
  checked: boolean | undefined
  onCheckedChange: (checked: boolean) => void
  when?: boolean
  disabled?: boolean
  size?: 'sm' | 'default'
  className?: string
}
export function SettingToggle({
  id,
  label,
  description,
  tooltip,
  checked,
  onCheckedChange,
  when = true,
  disabled = false,
  size = 'default',
  className,
}: SettingToggleProps) {
  return (
    <SettingField
      id={id}
      label={label}
      description={description}
      tooltip={tooltip}
      when={when}
      disabled={disabled}
      className={className}
      control={
        <Switch
          id={id}
          checked={checked ?? false}
          onCheckedChange={onCheckedChange}
          disabled={disabled}
          size={size}
        />
      }
    />
  )
}
