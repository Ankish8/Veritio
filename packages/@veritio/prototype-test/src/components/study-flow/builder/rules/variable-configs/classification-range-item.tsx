'use client'

import { memo } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '@veritio/ui/components/button'
import { Input } from '@veritio/ui/components/input'
import type { ClassificationRange } from '@veritio/prototype-test/lib/supabase/survey-rules-types'

export interface ClassificationRangeItemProps {
  range: ClassificationRange
  onUpdate: (updates: Partial<ClassificationRange>) => void
  onRemove: () => void
}
export const ClassificationRangeItem = memo(function ClassificationRangeItem({
  range,
  onUpdate,
  onRemove,
}: ClassificationRangeItemProps) {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-gray-50 p-3">
      <Input
        type="number"
        value={range.min}
        onChange={(e) => onUpdate({ min: parseInt(e.target.value) || 0 })}
        className="h-8 w-20"
        placeholder="Min"
      />
      <span className="text-muted-foreground">to</span>
      <Input
        type="number"
        value={range.max}
        onChange={(e) => onUpdate({ max: parseInt(e.target.value) || 0 })}
        className="h-8 w-20"
        placeholder="Max"
      />
      <span className="text-muted-foreground">=</span>
      <Input
        value={range.label}
        onChange={(e) => onUpdate({ label: e.target.value })}
        className="h-8 flex-1"
        placeholder="Label"
      />
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onRemove}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )
})
