'use client'

import { cn } from '@/lib/utils'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export interface LabeledSelectOption {
  value: string
  label: string
}

export interface LabeledSelectProps {
  label: string
  value: string
  onValueChange: (value: string) => void
  options: LabeledSelectOption[]
  placeholder?: string
  className?: string
  disabled?: boolean
}

function LabeledSelect({
  label,
  value,
  onValueChange,
  options,
  placeholder,
  className,
  disabled,
}: LabeledSelectProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <Label className="text-xs">{label}</Label>
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger className="w-full">
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
    </div>
  )
}

export { LabeledSelect }
