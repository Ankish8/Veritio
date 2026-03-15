'use client'

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { formatDuration } from '@/lib/utils'
import type { TaskEvent } from '../task-timeline/task-timeline'

interface TaskMarkerProps {
  task: TaskEvent
  duration: number
  onSeek: (timeMs: number) => void
}

/**
 * Simple circle marker on the timeline with tooltip on hover.
 */
export function TaskMarker({ task, duration, onSeek }: TaskMarkerProps) {
  // Clamp to 1-99% to prevent overflow at edges
  const rawLeft = (task.timestamp_ms / duration) * 100
  const left = Math.min(Math.max(rawLeft, 1), 99)

  const statusLabel = task.outcome === 'success' ? 'Completed' :
                      task.outcome === 'failure' ? 'Failed' :
                      task.outcome === 'skipped' ? 'Skipped' : 'Abandoned'

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          className={cn(
            "absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10",
            "w-5 h-5 rounded-full flex items-center justify-center",
            "bg-emerald-500 hover:bg-emerald-600 hover:scale-110",
            "transition-all duration-150 cursor-pointer",
            "ring-2 ring-white shadow-sm"
          )}
          style={{ left: `${left}%` }}
          onClick={(e) => {
            e.stopPropagation()
            onSeek(task.timestamp_ms)
          }}
        >
          <Check className="h-3 w-3 text-white" strokeWidth={3} />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[200px]">
        <p className="font-medium text-sm">{task.task_title}</p>
        <p className="text-xs text-muted-foreground">
          {statusLabel} at {formatDuration(task.timestamp_ms)}
        </p>
      </TooltipContent>
    </Tooltip>
  )
}
