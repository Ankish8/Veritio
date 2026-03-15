'use client'

/**
 * Response Timeline View
 *
 * Displays responses in chronological order with a vertical timeline.
 * Shows time markers and groups responses by day.
 */

import { useMemo } from 'react'
import { format, formatDistanceToNow, isSameDay } from 'date-fns'
import { cn } from '@/lib/utils'
import { ResponseCard } from './response-card'
import type {
  FirstImpressionResponse,
  FirstImpressionSession,
  FirstImpressionExposure,
} from '@/services/results/first-impression'

interface ResponseTimelineProps {
  studyId: string
  responses: FirstImpressionResponse[]
  sessions: FirstImpressionSession[]
  exposures: FirstImpressionExposure[]
  getDesignName: (designId: string) => string
  highlightWord?: string | null
  onViewParticipant?: (participantId: string) => void
}

interface GroupedResponses {
  date: Date
  label: string
  responses: FirstImpressionResponse[]
}

export function ResponseTimeline({
  studyId,
  responses,
  sessions,
  exposures,
  getDesignName,
  highlightWord,
  onViewParticipant,
}: ResponseTimelineProps) {
  // Sort responses by submission time (newest first)
  const sortedResponses = useMemo(() => {
    return [...responses].sort((a, b) => {
      const dateA = a.submitted_at ? new Date(a.submitted_at).getTime() : 0
      const dateB = b.submitted_at ? new Date(b.submitted_at).getTime() : 0
      return dateB - dateA
    })
  }, [responses])

  // Group responses by day
  const groupedResponses = useMemo(() => {
    const groups: GroupedResponses[] = []
    let currentGroup: GroupedResponses | null = null

    for (const response of sortedResponses) {
      if (!response.submitted_at) continue

      const date = new Date(response.submitted_at)

      if (!currentGroup || !isSameDay(currentGroup.date, date)) {
        const today = new Date()
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)

        let label: string
        if (isSameDay(date, today)) {
          label = 'Today'
        } else if (isSameDay(date, yesterday)) {
          label = 'Yesterday'
        } else {
          label = format(date, 'EEEE, MMMM d, yyyy')
        }

        currentGroup = {
          date,
          label,
          responses: [],
        }
        groups.push(currentGroup)
      }

      currentGroup.responses.push(response)
    }

    return groups
  }, [sortedResponses])

  // Lookup maps for performance
  const sessionMap = useMemo(() => {
    return new Map(sessions.map(s => [s.id, s]))
  }, [sessions])

  const exposureMap = useMemo(() => {
    return new Map(exposures.map(e => [e.id, e]))
  }, [exposures])

  if (sortedResponses.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No responses to display in timeline.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {groupedResponses.map((group, _groupIdx) => (
        <div key={group.label} className="relative">
          {/* Date Header */}
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 pb-2">
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-primary" />
              <h3 className="text-sm font-medium text-muted-foreground">
                {group.label}
              </h3>
              <span className="text-xs text-muted-foreground">
                ({group.responses.length} response{group.responses.length !== 1 ? 's' : ''})
              </span>
            </div>
          </div>

          {/* Timeline Content */}
          <div className="ml-[3px] border-l-2 border-muted pl-6 space-y-3">
            {group.responses.map((response, _idx) => {
              const session = sessionMap.get(response.session_id)
              const exposure = exposureMap.get(response.exposure_id)

              return (
                <div key={response.id} className="relative">
                  {/* Timeline Dot */}
                  <div
                    className={cn(
                      'absolute -left-[27px] top-3 w-2 h-2 rounded-full border-2 border-background',
                      'bg-muted-foreground/40'
                    )}
                  />

                  {/* Time Marker */}
                  <div className="text-xs text-muted-foreground mb-1">
                    {response.submitted_at
                      ? format(new Date(response.submitted_at), 'h:mm a')
                      : 'Unknown time'}
                    <span className="text-muted-foreground/60 ml-2">
                      ({formatDistanceToNow(new Date(response.submitted_at || ''), {
                        addSuffix: true,
                      })})
                    </span>
                  </div>

                  {/* Response Card */}
                  <ResponseCard
                    studyId={studyId}
                    response={response}
                    session={session}
                    exposure={exposure}
                    designName={getDesignName(response.design_id)}
                    highlightWord={highlightWord}
                    onViewParticipant={onViewParticipant}
                  />
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
