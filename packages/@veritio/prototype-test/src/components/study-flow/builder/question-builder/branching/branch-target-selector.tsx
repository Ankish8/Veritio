'use client'

import { memo } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@veritio/ui/components/select'
import type { BranchTarget } from '../../../../../lib/supabase/study-flow-types'
import { targetOptions } from './constants'

export interface BranchTargetSelectorProps {
  value: BranchTarget
  onChange: (value: BranchTarget) => void
  className?: string
}
export const BranchTargetSelector = memo(function BranchTargetSelector({
  value,
  onChange,
  className = 'w-auto min-w-fit',
}: BranchTargetSelectorProps) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as BranchTarget)}>
      <SelectTrigger className={className}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {targetOptions.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            <div className="flex items-center gap-2">
              {opt.icon}
              <span>{opt.label}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
})
