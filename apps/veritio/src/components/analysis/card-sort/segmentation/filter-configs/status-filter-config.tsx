'use client'

import { memo } from 'react'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import type { SegmentOperator } from '@/stores/segment-store'

interface StatusOption {
  value: string
  count: number
}

export interface StatusFilterConfigProps {
  availableStatuses: StatusOption[]
  value: string | string[] | undefined
  onChange: (operator: SegmentOperator, value: string | string[]) => void
}

export const StatusFilterConfig = memo(function StatusFilterConfig({
  availableStatuses,
  value,
  onChange,
}: StatusFilterConfigProps) {
  const handleCheck = (statusValue: string, checked: boolean) => {
    const current = Array.isArray(value) ? value : value ? [value] : []
    const newValue = checked
      ? [...current, statusValue]
      : current.filter((v) => v !== statusValue)

    onChange(
      newValue.length > 1 ? 'in' : 'equals',
      newValue.length === 1 ? newValue[0] : newValue
    )
  }

  const isChecked = (statusValue: string) => {
    return Array.isArray(value) ? value.includes(statusValue) : value === statusValue
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Status is</Label>
        <div className="space-y-2">
          {availableStatuses.map(({ value: statusValue, count }) => (
            <label
              key={statusValue}
              className="flex items-center gap-2 cursor-pointer"
            >
              <Checkbox
                checked={isChecked(statusValue)}
                onCheckedChange={(checked) => handleCheck(statusValue, !!checked)}
              />
              <span className="capitalize">{statusValue.replace('_', ' ')}</span>
              <span className="text-xs text-muted-foreground ml-auto">
                ({count})
              </span>
            </label>
          ))}
        </div>
      </div>
    </div>
  )
})
