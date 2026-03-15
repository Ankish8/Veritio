'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SettingField } from './setting-field'

export interface SettingSelectOption<T extends string> {
  /** Option value */
  value: T
  /** Display label */
  label: string
}

export interface SettingSelectProps<T extends string> {
  /** Unique ID for the select */
  id: string

  /** Label text */
  label: string

  /** Optional description shown below the select */
  description?: string

  /** Select options */
  options: SettingSelectOption<T>[]

  /** Currently selected value */
  value: T

  /** Called when selection changes */
  onValueChange: (value: T) => void

  /** Placeholder text when no value selected */
  placeholder?: string

  /** Conditional visibility - only render when true (defaults to true) */
  when?: boolean

  /** Disabled state */
  disabled?: boolean

  /** Additional wrapper classes */
  className?: string
}

export function SettingSelect<T extends string>({
  id,
  label,
  description,
  options,
  value,
  onValueChange,
  placeholder = 'Select option',
  when = true,
  disabled = false,
  className,
}: SettingSelectProps<T>) {
  return (
    <SettingField
      id={id}
      label={label}
      description={description}
      when={when}
      disabled={disabled}
      variant="vertical"
      className={className}
      control={
        <Select value={value} onValueChange={onValueChange} disabled={disabled}>
          <SelectTrigger id={id} className="w-full">
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      }
    />
  )
}
