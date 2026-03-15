'use client'

import { Switch } from '@/components/ui/switch'
import { SettingField } from './setting-field'

export interface SettingToggleProps {
  /** Unique ID for the toggle (used for accessibility) */
  id: string

  /** Label text */
  label: string

  /** Optional description shown below the label */
  description?: string

  /** Optional tooltip text shown next to label via info icon */
  tooltip?: string

  /** Checked state (defaults to false if undefined) */
  checked: boolean | undefined

  /** Called when the toggle state changes */
  onCheckedChange: (checked: boolean) => void

  /** Conditional visibility - only render when true (defaults to true) */
  when?: boolean

  /** Disabled state */
  disabled?: boolean

  /** Switch size variant */
  size?: 'sm' | 'default'

  /** Additional wrapper classes */
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
