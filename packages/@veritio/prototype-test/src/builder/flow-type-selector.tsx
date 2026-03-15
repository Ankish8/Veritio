'use client'

import { Target, Compass } from 'lucide-react'
import { cn } from '@veritio/ui'

export type FlowType = 'task_flow' | 'free_flow'

interface FlowTypeSelectorProps {
  value: FlowType
  onChange: (value: FlowType) => void
  disabled?: boolean
}

const flowTypes = [
  {
    id: 'task_flow' as const,
    icon: Target,
    label: 'Task Flow',
    description: 'Ask participants to complete a task',
  },
  {
    id: 'free_flow' as const,
    icon: Compass,
    label: 'Free Flow',
    description: 'Ask questions while participants roam around',
  },
]

export function FlowTypeSelector({ value, onChange, disabled }: FlowTypeSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {flowTypes.map((type) => {
        const Icon = type.icon
        const isSelected = value === type.id

        return (
          <button
            key={type.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(type.id)}
            className={cn(
              'relative flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all text-left',
              'hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
              isSelected
                ? 'border-primary bg-primary/5'
                : 'border-muted bg-card hover:bg-muted/50',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            {/* Selection indicator */}
            <div
              className={cn(
                'absolute top-3 left-3 w-4 h-4 rounded-full border-2 flex items-center justify-center',
                isSelected ? 'border-primary' : 'border-muted-foreground/30'
              )}
            >
              {isSelected && (
                <div className="w-2 h-2 rounded-full bg-primary" />
              )}
            </div>

            <Icon
              className={cn(
                'h-6 w-6 mt-2',
                isSelected ? 'text-primary' : 'text-muted-foreground'
              )}
            />
            <div className="text-center">
              <p
                className={cn(
                  'font-medium text-sm',
                  isSelected ? 'text-primary' : 'text-foreground'
                )}
              >
                {type.label}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {type.description}
              </p>
            </div>
          </button>
        )
      })}
    </div>
  )
}
