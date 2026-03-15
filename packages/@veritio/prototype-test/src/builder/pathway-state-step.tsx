'use client'

import { memo } from 'react'
import { Layers, Trash2 } from 'lucide-react'
import { Button } from '@veritio/ui/components/button'
import { Input } from '@veritio/ui/components/input'
import { Badge } from '@veritio/ui/components/badge'
import { cn } from '@veritio/ui'
import type { PathwayStateStep as PathwayStateStepType } from '@veritio/prototype-test/lib/supabase/study-flow-types'

interface PathwayStateStepProps {
  step: PathwayStateStepType
  index: number
  isHovered: boolean
  onHover: (hovered: boolean) => void
  onDelete: () => void
  onUpdateLabel: (label: string) => void
  canDelete: boolean
}
export const PathwayStateStep = memo(function PathwayStateStep({
  step,
  index,
  isHovered,
  onHover,
  onDelete,
  onUpdateLabel,
  canDelete,
}: PathwayStateStepProps) {
  const displayLabel = step.customLabel ||
    (step.componentName && step.variantName
      ? `${step.componentName}: ${step.variantName}`
      : step.componentName || `State ${step.componentNodeId.slice(-6)}`)

  return (
    <div
      onMouseEnter={() => canDelete && onHover(true)}
      onMouseLeave={() => onHover(false)}
      onClick={() => canDelete && onDelete()}
      className={cn(
        'relative rounded-lg border bg-gradient-to-br from-violet-50/50 to-purple-50/50 dark:from-violet-950/20 dark:to-purple-950/20 border-violet-200/50 dark:border-violet-800/50 overflow-hidden transition-all',
        canDelete && 'cursor-pointer hover:shadow-md',
        isHovered && 'ring-2 ring-red-400'
      )}
    >
      {/* Content */}
      <div className="p-3 space-y-2">
        {/* Header row */}
        <div className="flex items-center gap-2">
          {/* Step number badge */}
          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-violet-600 text-white text-xs font-medium flex items-center justify-center">
            {index + 1}
          </span>

          {/* State icon */}
          <div className="w-6 h-6 rounded bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center">
            <Layers className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
          </div>

          {/* Type badge */}
          <Badge variant="secondary" className="text-[12px] bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300">
            State Change
          </Badge>
        </div>

        {/* Display name */}
        <p className="text-sm font-medium text-foreground truncate px-1">
          {displayLabel}
        </p>

        {/* Component details (if available) */}
        {step.variantName && (
          <p className="text-[12px] text-muted-foreground px-1 truncate">
            → {step.variantName}
          </p>
        )}
      </div>

      {/* Delete overlay when hovered */}
      {isHovered && (
        <div className="absolute inset-0 bg-red-500/30 flex items-center justify-center transition-opacity">
          <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow-md">
            <Trash2 className="h-5 w-5 text-destructive" />
          </div>
        </div>
      )}
    </div>
  )
})

interface AddStateStepButtonProps {
  onClick: () => void
  disabled?: boolean
}
export function AddStateStepButton({ onClick, disabled }: AddStateStepButtonProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      disabled={disabled}
      className="w-full border-dashed border-violet-300 text-violet-600 hover:bg-violet-50 dark:border-violet-700 dark:text-violet-400 dark:hover:bg-violet-950/50"
    >
      <Layers className="w-4 h-4 mr-2" />
      Add State Step
    </Button>
  )
}

interface DetectedStateChangeProps {
  nodeId: string
  fromVariant: string | null
  toVariant: string
  onAdd: () => void
}
export function DetectedStateChange({
  nodeId,
  fromVariant,
  toVariant,
  onAdd,
}: DetectedStateChangeProps) {
  return (
    <div className="flex items-center justify-between gap-2 p-2 bg-violet-50/50 dark:bg-violet-950/30 rounded-md border border-violet-200/50 dark:border-violet-800/50">
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-medium text-violet-700 dark:text-violet-300 truncate">
          Component {nodeId.slice(-8)}
        </p>
        <p className="text-[12px] text-muted-foreground truncate">
          {fromVariant?.slice(-8) || '?'} → {toVariant.slice(-8)}
        </p>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onAdd}
        className="h-6 text-[12px] text-violet-600 hover:text-violet-700 hover:bg-violet-100 dark:text-violet-400 dark:hover:bg-violet-900/50"
      >
        Add to path
      </Button>
    </div>
  )
}
