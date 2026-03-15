'use client'

import { memo } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { SegmentOperator } from '@/stores/segment-store'

export interface CategoriesFilterConfigProps {
  categoriesRange: { min: number; max: number }
  operator: SegmentOperator | undefined
  value: number | [number, number] | undefined
  onOperatorChange: (operator: SegmentOperator, defaultValue: number | [number, number]) => void
  onChange: (value: number | [number, number]) => void
}

export const CategoriesFilterConfig = memo(function CategoriesFilterConfig({
  categoriesRange,
  operator,
  value,
  onOperatorChange,
  onChange,
}: CategoriesFilterConfigProps) {
  const handleOperatorChange = (op: string) => {
    const defaultValue =
      op === 'between'
        ? ([categoriesRange.min, categoriesRange.max] as [number, number])
        : categoriesRange.min
    onOperatorChange(op as SegmentOperator, defaultValue)
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Operator</Label>
        <Select value={operator} onValueChange={handleOperatorChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select condition" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="equals">Equals</SelectItem>
            <SelectItem value="greater_than">Greater than</SelectItem>
            <SelectItem value="less_than">Less than</SelectItem>
            <SelectItem value="between">Between</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {operator === 'between' ? (
        <div className="space-y-2">
          <Label>
            Range: {(value as [number, number])?.[0] ?? categoriesRange.min} -{' '}
            {(value as [number, number])?.[1] ?? categoriesRange.max}
          </Label>
          <Slider
            min={categoriesRange.min}
            max={categoriesRange.max}
            step={1}
            value={(value as [number, number]) || [categoriesRange.min, categoriesRange.max]}
            onValueChange={(v) => onChange(v as [number, number])}
          />
        </div>
      ) : operator ? (
        <div className="space-y-2">
          <Label>Value</Label>
          <Input
            type="number"
            min={categoriesRange.min}
            max={categoriesRange.max}
            value={value as number}
            onChange={(e) => onChange(parseInt(e.target.value, 10))}
          />
        </div>
      ) : null}
    </div>
  )
})
