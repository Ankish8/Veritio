'use client'

import { Check, X, SkipForward, Circle, Play } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TaskEvent } from '../task-timeline/task-timeline'

// Re-export TaskEvent for convenience
export type { TaskEvent as TaskCardEvent } from '../task-timeline/task-timeline'

interface TaskCardProps {
  task: TaskEvent
  onClick: () => void
  isActive?: boolean
}

const OUTCOME_CONFIG = {
  success: {
    icon: Check,
    dotColor: 'bg-green-500',
    label: 'Completed',
  },
  failure: {
    icon: X,
    dotColor: 'bg-red-500',
    label: 'Failed',
  },
  skipped: {
    icon: SkipForward,
    dotColor: 'bg-amber-500',
    label: 'Skipped',
  },
  abandoned: {
    icon: Circle,
    dotColor: 'bg-muted-foreground',
    label: 'Abandoned',
  },
}

/**
 * Subtle inline task indicator displayed within the transcript panel.
 * Minimal design that fits seamlessly with transcript segments.
 */
export function TaskCard({ task, onClick, isActive }: TaskCardProps) {
  const config = OUTCOME_CONFIG[task.outcome]

  // Format time as MM:SS
  const formatTime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000)
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        'group w-full text-left py-2 px-3 rounded-md transition-colors',
        'hover:bg-muted/50 cursor-pointer',
        isActive && 'bg-muted/50'
      )}
      title="Click to jump to this moment"
    >
      <div className="flex items-center gap-2.5">
        {/* Status dot */}
        <div className={cn('w-2 h-2 rounded-full flex-shrink-0', config.dotColor)} />

        {/* Task title */}
        <span className="flex-1 text-sm text-muted-foreground truncate">
          {task.task_title}
        </span>

        {/* Timestamp & status */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-muted-foreground/70">
            {config.label}
          </span>
          <span className="text-xs font-mono text-muted-foreground group-hover:text-foreground transition-colors">
            {formatTime(task.timestamp_ms)}
          </span>
          <Play className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
    </button>
  )
}
