'use client'

import { Label } from '@veritio/ui'
import { Input } from '@veritio/ui'

interface SelectionLimitsConfigProps {
  minSelections?: number
  maxSelections?: number
  maxOptions: number
  onChange: (updates: { minSelections?: number; maxSelections?: number }) => void
}
export function SelectionLimitsConfig({
  minSelections,
  maxSelections,
  maxOptions,
  onChange,
}: SelectionLimitsConfigProps) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <Label className="text-sm text-muted-foreground whitespace-nowrap">Selection limits:</Label>
      <div className="flex items-center gap-2">
        <Input
          id="min-selections"
          type="number"
          min={0}
          max={maxOptions}
          value={minSelections?.toString() || ''}
          onChange={(e) =>
            onChange({
              minSelections: e.target.value ? parseInt(e.target.value) : undefined,
              maxSelections,
            })
          }
          placeholder="Min"
          className="h-8 w-20"
        />
        <span className="text-sm text-muted-foreground">to</span>
        <Input
          id="max-selections"
          type="number"
          min={1}
          max={maxOptions}
          value={maxSelections?.toString() || ''}
          onChange={(e) =>
            onChange({
              minSelections,
              maxSelections: e.target.value ? parseInt(e.target.value) : undefined,
            })
          }
          placeholder="Max"
          className="h-8 w-20"
        />
      </div>
    </div>
  )
}
