'use client'

import { cn } from '@veritio/ui'

export type FlowType = 'task_flow' | 'free_flow'

interface CompactFlowTypeSelectorProps {
  value: FlowType
  onChange: (value: FlowType) => void
  disabled?: boolean
}

const flowTypes = [
  { id: 'task_flow' as const, label: 'Task Flow' },
  { id: 'free_flow' as const, label: 'Free Flow' },
]

export function CompactFlowTypeSelector({
  value,
  onChange,
  disabled,
}: CompactFlowTypeSelectorProps) {
  return (
    <div className="inline-flex w-full items-center rounded-lg bg-muted p-1 text-muted-foreground">
      {flowTypes.map((type) => {
        const isSelected = value === type.id

        return (
          <button
            key={type.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(type.id)}
            className={cn(
              'flex-1 inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-all',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              isSelected
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
              disabled && 'pointer-events-none opacity-50'
            )}
          >
            {type.label}
          </button>
        )
      })}
    </div>
  )
}
