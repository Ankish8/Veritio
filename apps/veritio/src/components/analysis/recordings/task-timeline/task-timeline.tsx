'use client'

import { CheckCircle2, XCircle, SkipForward, Circle } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface TaskEvent {
  task_id: string
  task_title: string
  timestamp_ms: number
  outcome: 'success' | 'failure' | 'skipped' | 'abandoned'
}

export interface TaskTimelineProps {
  /** Task start/end events from recording_events table */
  taskEvents: TaskEvent[]
  /** Current playback time in milliseconds */
  currentTime: number
  /** Total recording duration in milliseconds */
  duration: number
  /** Callback when task marker is clicked */
  onTaskClick: (timestamp: number) => void
}

const OUTCOME_CONFIG = {
  success: {
    icon: CheckCircle2,
    color: 'text-green-600',
    bgColor: 'bg-green-100 dark:bg-green-950',
    borderColor: 'border-green-600',
    label: 'Completed',
  },
  failure: {
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-100 dark:bg-red-950',
    borderColor: 'border-red-600',
    label: 'Failed',
  },
  skipped: {
    icon: SkipForward,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100 dark:bg-yellow-950',
    borderColor: 'border-yellow-600',
    label: 'Skipped',
  },
  abandoned: {
    icon: Circle,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
    borderColor: 'border-muted-foreground',
    label: 'Abandoned',
  },
}

/**
 * Task timeline with color-coded markers showing task start/completion.
 *
 * Features:
 * - Visual markers on timeline (green=success, red=failure, yellow=skipped)
 * - Click marker to jump to task start
 * - Shows task titles and outcomes
 * - Synced with video playback progress
 *
 * @example
 * ```tsx
 * <TaskTimeline
 *   taskEvents={events}
 *   currentTime={videoTime}
 *   duration={totalDuration}
 *   onTaskClick={(time) => seekTo(time)}
 * />
 * ```
 */
export function TaskTimeline({
  taskEvents,
  currentTime,
  duration,
  onTaskClick,
}: TaskTimelineProps) {
  if (taskEvents.length === 0) {
    return null
  }

  // Format time as MM:SS
  const formatTime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000)
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="p-4 border-t bg-card">
      <h3 className="text-sm font-medium mb-3">Task Timeline</h3>

      {/* Timeline Bar */}
      <div className="relative h-12 mb-4">
        {/* Progress bar */}
        <div className="absolute inset-0 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary/20 transition-all"
            style={{ width: `${(currentTime / duration) * 100}%` }}
          />
        </div>

        {/* Task markers */}
        {taskEvents.map((event, idx) => {
          const position = (event.timestamp_ms / duration) * 100
          const config = OUTCOME_CONFIG[event.outcome]
          const Icon = config.icon

          return (
            <button
              key={`${event.task_id}-${idx}`}
              onClick={() => onTaskClick(event.timestamp_ms)}
              className={cn(
                'absolute -translate-x-1/2 -translate-y-1/2 top-1/2',
                'flex items-center justify-center',
                'w-8 h-8 rounded-full border-2 transition-all',
                'hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring',
                config.bgColor,
                config.borderColor
              )}
              style={{ left: `${position}%` }}
              title={`${event.task_title} - ${config.label}`}
            >
              <Icon className={cn('h-4 w-4', config.color)} />
            </button>
          )
        })}

        {/* Current position indicator */}
        <div
          className="absolute -translate-x-1/2 top-0 bottom-0 w-0.5 bg-primary pointer-events-none"
          style={{ left: `${(currentTime / duration) * 100}%` }}
        />
      </div>

      {/* Task list */}
      <div className="space-y-2">
        {taskEvents.map((event, idx) => {
          const config = OUTCOME_CONFIG[event.outcome]
          const Icon = config.icon

          return (
            <button
              key={`${event.task_id}-${idx}`}
              onClick={() => onTaskClick(event.timestamp_ms)}
              className={cn(
                'w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors',
                'hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring'
              )}
            >
              <div className={cn('flex items-center justify-center w-6 h-6 rounded-full', config.bgColor)}>
                <Icon className={cn('h-4 w-4', config.color)} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{event.task_title}</p>
                <p className="text-xs text-muted-foreground">{config.label}</p>
              </div>
              <span className="text-xs font-mono text-muted-foreground">
                {formatTime(event.timestamp_ms)}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
