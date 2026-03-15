'use client'

import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { cn } from '@/lib/utils'

export interface SettingRadioOption<T extends string> {
  /** Option value */
  value: T
  /** Display label */
  label: string
  /** Optional description below the label */
  description?: string
}

export interface SettingRadioGroupProps<T extends string> {
  /** Optional label for the radio group */
  label?: string

  /** Optional description for the entire group */
  description?: string

  /** Radio options to display */
  options: SettingRadioOption<T>[]

  /** Currently selected value */
  value: T

  /** Called when selection changes */
  onValueChange: (value: T) => void

  /** Conditional visibility - only render when true (defaults to true) */
  when?: boolean

  /** Disabled state */
  disabled?: boolean

  /** Additional wrapper classes */
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
