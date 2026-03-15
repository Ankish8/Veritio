'use client'

import { useMemo } from 'react'
import { MessageSquare, CheckCircle2, XCircle, SkipForward, Circle } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { formatDuration } from '@/lib/utils'
import type { TaskEvent } from '../../task-timeline/task-timeline'

interface Comment {
  id: string
  recording_id: string
  timestamp_ms: number | null
  content: string
  author_id: string
  author_name: string | null
  author_email: string | null
  created_at: string
  updated_at: string
}

export interface MarkersTrackProps {
  comments: Comment[]
  taskEvents: TaskEvent[]
  duration: number
  pixelsPerMs: number
  onSeek: (time: number) => void
}

/**
 * Track showing comments and tasks as markers.
 * - Comments: Blue message icons
 * - Tasks: Color-coded by outcome (green/red/yellow/gray)
 */
export function MarkersTrack({
  comments,
  taskEvents,
  duration: _duration,
  pixelsPerMs,
  onSeek,
}: MarkersTrackProps) {
  // Combine and sort all markers by time
  const markers = useMemo(() => {
    const result: Array<{
      type: 'comment' | 'task'
      id: string
      time: number
      data: Comment | TaskEvent
    }> = []

    // Add comments
    for (const comment of comments) {
      if (comment.timestamp_ms !== null) {
        result.push({
          type: 'comment',
          id: comment.id,
          time: comment.timestamp_ms,
          data: comment,
        })
      }
    }

    // Add tasks
    for (const task of taskEvents) {
      result.push({
        type: 'task',
        id: task.task_id,
        time: task.timestamp_ms,
        data: task,
      })
    }

    // Sort by time
    return result.sort((a, b) => a.time - b.time)
  }, [comments, taskEvents])

  // Get icon and color for task outcome
  const getTaskStyle = (outcome: TaskEvent['outcome']) => {
    switch (outcome) {
      case 'success':
        return { icon: CheckCircle2, color: 'text-green-400 bg-green-500/20' }
      case 'failure':
        return { icon: XCircle, color: 'text-red-400 bg-red-500/20' }
      case 'skipped':
        return { icon: SkipForward, color: 'text-yellow-400 bg-yellow-500/20' }
      case 'abandoned':
      default:
        return { icon: Circle, color: 'text-muted-foreground bg-muted' }
    }
  }

  if (markers.length === 0) {
    return null
  }

  return (
    <div className="h-8 bg-muted/30 relative border-b">
      {/* Track label */}
      <div className="absolute left-0 top-0 bottom-0 w-20 bg-muted/50 border-r flex items-center px-2 z-10">
        <span className="text-xs text-muted-foreground font-medium">Markers</span>
      </div>

      {/* Markers container */}
      <div className="absolute left-20 right-0 top-0 bottom-0">
        <TooltipProvider>
          {markers.map((marker) => {
            const position = marker.time * pixelsPerMs

            if (marker.type === 'comment') {
              const comment = marker.data as Comment
              return (
                <Tooltip key={`comment-${marker.id}`}>
                  <TooltipTrigger asChild>
                    <button
                      className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center hover:bg-blue-500/40 transition-colors"
                      style={{ left: position }}
                      onClick={() => onSeek(marker.time)}
                    >
                      <MessageSquare className="h-3 w-3 text-blue-400" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <p className="font-medium text-xs">{formatDuration(marker.time)}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{comment.content}</p>
                    {comment.author_name && (
                      <p className="text-xs text-muted-foreground mt-1">— {comment.author_name}</p>
                    )}
                  </TooltipContent>
                </Tooltip>
              )
            }

            // Task marker
            const task = marker.data as TaskEvent
            const { icon: Icon, color } = getTaskStyle(task.outcome)

            return (
              <Tooltip key={`task-${marker.id}-${marker.time}`}>
                <TooltipTrigger asChild>
                  <button
                    className={cn(
                      'absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full flex items-center justify-center hover:brightness-125 transition-all',
                      color
                    )}
                    style={{ left: position }}
                    onClick={() => onSeek(marker.time)}
                  >
                    <Icon className="h-3 w-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p className="font-medium text-xs">{task.task_title}</p>
                  <p className="text-xs text-muted-foreground">
                    {task.outcome === 'success' ? 'Completed' :
                     task.outcome === 'failure' ? 'Failed' :
                     task.outcome === 'skipped' ? 'Skipped' : 'Abandoned'}
                    {' • '}
                    {formatDuration(marker.time)}
                  </p>
                </TooltipContent>
              </Tooltip>
            )
          })}
        </TooltipProvider>
      </div>
    </div>
  )
}
