'use client'

import { memo } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@veritio/ui/components/button'
import { Input } from '@veritio/ui/components/input'
import { Label } from '@veritio/ui/components/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@veritio/ui/components/select'
import { ClassificationRangeItem } from './classification-range-item'
import type { ClassificationRange } from '@veritio/prototype-test/lib/supabase/survey-rules-types'
import type { SurveyVariable } from '@veritio/prototype-test/lib/supabase/survey-rules-types'

export interface ClassificationVariableConfigProps {
  sourceVariable: string
  ranges: ClassificationRange[]
  defaultLabel: string
  scoreVariables: SurveyVariable[]
  currentVariableId: string | null
  onSourceVariableChange: (value: string) => void
  onRangesChange: (ranges: ClassificationRange[]) => void
  onDefaultLabelChange: (value: string) => void
}
export const ClassificationVariableConfig = memo(function ClassificationVariableConfig({
  sourceVariable,
  ranges,
  defaultLabel,
  scoreVariables,
  currentVariableId,
  onSourceVariableChange,
  onRangesChange,
  onDefaultLabelChange,
}: ClassificationVariableConfigProps) {
  const handleAddRange = () => {
    const lastRange = ranges[ranges.length - 1]
    const nextMin = lastRange ? lastRange.max + 1 : 0
    onRangesChange([
      ...ranges,
      { min: nextMin, max: nextMin + 10, label: `Range ${ranges.length + 1}` },
    ])
  }

  const handleRemoveRange = (index: number) => {
    onRangesChange(ranges.filter((_, i) => i !== index))
  }

  const handleUpdateRange = (index: number, updates: Partial<ClassificationRange>) => {
    onRangesChange(ranges.map((r, i) => (i === index ? { ...r, ...updates } : r)))
  }

  // Filter to only score variables (excluding current if editing)
  const availableScoreVariables = scoreVariables.filter(
    (v) => v.variable_type === 'score' && v.id !== currentVariableId
  )

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Source Variable</Label>
        <Select value={sourceVariable} onValueChange={onSourceVariableChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select a score variable" />
          </SelectTrigger>
          <SelectContent>
            {availableScoreVariables.map((v) => (
              <SelectItem key={v.id} value={v.name}>
                {v.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {availableScoreVariables.length === 0 && (
          <p className="text-xs text-muted-foreground">
            Create a score variable first to use classification.
          </p>
        )}
      </div>

      <div className="flex items-center justify-between">
        <Label>Classification Ranges</Label>
        <Button variant="outline" size="sm" onClick={handleAddRange}>
          <Plus className="mr-1 h-3 w-3" />
          Add Range
        </Button>
      </div>

      {ranges.length === 0 ? (
        <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
          No ranges defined. Add ranges to classify scores.
        </div>
      ) : (
        <div className="space-y-2">
          {ranges.map((range, index) => (
            <ClassificationRangeItem
              key={index}
              range={range}
              onUpdate={(updates) => handleUpdateRange(index, updates)}
              onRemove={() => handleRemoveRange(index)}
            />
          ))}
        </div>
      )}

      <div className="space-y-2">
        <Label>Default Label (if no range matches)</Label>
        <Input value={defaultLabel} onChange={(e) => onDefaultLabelChange(e.target.value)} />
      </div>
    </div>
  )
})
