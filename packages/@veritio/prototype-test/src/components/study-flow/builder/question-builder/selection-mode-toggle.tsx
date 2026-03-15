'use client'

import { Label } from '@veritio/ui'
import { CircleDot, CheckSquare, ChevronDownCircle } from 'lucide-react'
import { cn } from '@veritio/ui'
import type { MultipleChoiceMode } from '../../../../lib/supabase/study-flow-types'

interface SelectionModeToggleProps {
  value: MultipleChoiceMode
  onValueChange: (value: MultipleChoiceMode) => void
  hideLabel?: boolean
}

const modes = [
  { value: 'single' as const, label: 'Single-select', icon: CircleDot },
  { value: 'multi' as const, label: 'Multi-select', icon: CheckSquare },
  { value: 'dropdown' as const, label: 'Dropdown', icon: ChevronDownCircle },
]
export function SelectionModeToggle({
  value,
  onValueChange,
  hideLabel = false,
}: SelectionModeToggleProps) {
  return (
    <div className="space-y-2">
      {!hideLabel && <Label className="text-sm font-medium">Type</Label>}
      <div className="inline-flex items-center p-1 gap-1 rounded-lg bg-muted">
        {modes.map((mode) => {
          const Icon = mode.icon
          const isSelected = value === mode.value
          return (
            <button
              key={mode.value}
              type="button"
              onClick={() => onValueChange(mode.value)}
              className={cn(
                'inline-flex items-center justify-center gap-1.5 whitespace-nowrap text-sm font-medium transition-all',
                'rounded-md px-3 py-1.5',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                'disabled:pointer-events-none disabled:opacity-50',
                isSelected
                  ? 'bg-background text-foreground shadow-sm ring-1 ring-border'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              aria-pressed={isSelected}
              aria-label={mode.label}
            >
              <Icon className="h-4 w-4" />
              {mode.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
