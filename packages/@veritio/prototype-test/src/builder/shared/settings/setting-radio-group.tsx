'use client'

import { Label, RadioGroup, RadioGroupItem, cn } from '@veritio/ui'

export interface SettingRadioOption<T extends string> {
  value: T
  label: string
  description?: string
}

export interface SettingRadioGroupProps<T extends string> {
  label?: string
  description?: string
  options: SettingRadioOption<T>[]
  value: T
  onValueChange: (value: T) => void
  when?: boolean
  disabled?: boolean
  className?: string
}
export function SettingRadioGroup<T extends string>({
  label,
  description,
  options,
  value,
  onValueChange,
  when = true,
  disabled = false,
  className,
}: SettingRadioGroupProps<T>) {
  if (!when) return null

  return (
    <div className={cn('space-y-3', className)}>
      {label && <Label className="text-sm font-medium">{label}</Label>}
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}

      <RadioGroup
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        className="flex flex-col gap-4"
      >
        {options.map((option) => (
          <label
            key={option.value}
            htmlFor={option.value}
            className={cn(
              'flex items-start gap-3 cursor-pointer group',
              disabled && 'cursor-not-allowed opacity-50'
            )}
          >
            <RadioGroupItem
              value={option.value}
              id={option.value}
              className="shrink-0 mt-0.5"
            />
            <div className="flex-1 flex flex-col gap-0.5">
              <span className="text-sm font-medium leading-tight">
                {option.label}
              </span>
              {option.description && (
                <span className="text-xs text-muted-foreground leading-snug">
                  {option.description}
                </span>
              )}
            </div>
          </label>
        ))}
      </RadioGroup>
    </div>
  )
}
