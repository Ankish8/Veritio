'use client'

import { memo, useState } from 'react'
import { Play, Pause, CheckCircle2, RotateCcw, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import type { StudyStatus } from './study-status-badge'

interface StudyStatusToggleProps {
  status: StudyStatus
  onStatusChange: (status: StudyStatus) => void
  disabled?: boolean
}

const statusConfig: Record<StudyStatus, { label: string; className: string; hoverClass: string }> = {
  draft: {
    label: 'Draft',
    className: 'bg-muted text-muted-foreground',
    hoverClass: 'hover:bg-muted/80',
  },
  active: {
    label: 'Active',
    className: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400',
    hoverClass: 'hover:bg-green-200 dark:hover:bg-green-900',
  },
  paused: {
    label: 'Paused',
    className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400',
    hoverClass: 'hover:bg-yellow-200 dark:hover:bg-yellow-900',
  },
  completed: {
    label: 'Completed',
    className: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400',
    hoverClass: 'hover:bg-blue-200 dark:hover:bg-blue-900',
  },
}

interface StatusOption {
  status: StudyStatus
  label: string
  icon: React.ReactNode
  description: string
}

function getAvailableTransitions(currentStatus: StudyStatus): StatusOption[] {
  const iconClass = 'h-4 w-4'

  switch (currentStatus) {
    case 'draft':
      // Draft studies don't have status transitions - they must be launched from the builder
      return []
    case 'active':
      return [
        {
          status: 'paused',
          label: 'Pause Study',
          icon: <Pause className={iconClass} />,
          description: 'Temporarily stop responses',
        },
        {
          status: 'completed',
          label: 'Complete Study',
          icon: <CheckCircle2 className={iconClass} />,
          description: 'Mark as finished',
        },
      ]
    case 'paused':
      return [
        {
          status: 'active',
          label: 'Resume Study',
          icon: <Play className={iconClass} />,
          description: 'Continue collecting responses',
        },
        {
          status: 'completed',
          label: 'Complete Study',
          icon: <CheckCircle2 className={iconClass} />,
          description: 'Mark as finished',
        },
      ]
    case 'completed':
      return [
        {
          status: 'active',
          label: 'Reopen Study',
          icon: <RotateCcw className={iconClass} />,
          description: 'Resume collecting responses',
        },
      ]
    default:
      return []
  }
}

export const StudyStatusToggle = memo(function StudyStatusToggle({
  status,
  onStatusChange,
  disabled = false,
}: StudyStatusToggleProps) {
  const [open, setOpen] = useState(false)
  const config = statusConfig[status]
  const transitions = getAvailableTransitions(status)

  const handleSelect = (newStatus: StudyStatus) => {
    onStatusChange(newStatus)
    setOpen(false)
  }

  // Draft studies show a static pill - no dropdown since they must be launched from the builder
  if (status === 'draft') {
    return (
      <span
        className={cn(
          'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
          config.className
        )}
      >
        {config.label}
      </span>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <button
          className={cn(
            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
            'transition-all duration-150 cursor-pointer',
            'focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary/50',
            config.className,
            !disabled && config.hoverClass,
            disabled && 'opacity-50 cursor-not-allowed'
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {config.label}
          <ChevronDown className="h-3 w-3 opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-56 p-1"
        align="start"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-xs font-medium text-muted-foreground px-2 py-1.5">
          Change status
        </div>
        {transitions.map((option) => (
          <button
            key={option.status}
            className={cn(
              'w-full flex items-start gap-3 rounded-md px-2 py-2 text-left',
              'transition-colors hover:bg-accent',
              'focus:outline-none focus:bg-accent'
            )}
            onClick={() => handleSelect(option.status)}
          >
            <span className="mt-0.5 text-muted-foreground">{option.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium">{option.label}</div>
              <div className="text-xs text-muted-foreground">{option.description}</div>
            </div>
          </button>
        ))}
      </PopoverContent>
    </Popover>
  )
})
