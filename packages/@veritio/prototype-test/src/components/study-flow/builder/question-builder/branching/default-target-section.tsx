'use client'

import { memo } from 'react'
import { Label } from '@veritio/ui/components/label'
import type { BranchTarget } from '../../../../../lib/supabase/study-flow-types'
import { BranchTargetSelector } from './branch-target-selector'

export interface DefaultTargetSectionProps {
  value: BranchTarget
  onChange: (value: BranchTarget) => void
  description?: string
}
export const DefaultTargetSection = memo(function DefaultTargetSection({
  value,
  onChange,
  description = 'When no specific rule matches (e.g., "Other" responses)',
}: DefaultTargetSectionProps) {
  return (
    <div className="pt-4 border-t">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Label className="text-sm font-medium">Default Action</Label>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <BranchTargetSelector value={value} onChange={onChange} />
      </div>
    </div>
  )
})
