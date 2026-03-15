'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@veritio/ui'
import { SettingField } from './setting-field'

export interface SettingSelectOption<T extends string> {
  value: T
  label: string
}

export interface SettingSelectProps<T extends string> {
  id: string
  label: string
  description?: string
  options: SettingSelectOption<T>[]
  value: T
  onValueChange: (value: T) => void
  placeholder?: string
  when?: boolean
  disabled?: boolean
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
