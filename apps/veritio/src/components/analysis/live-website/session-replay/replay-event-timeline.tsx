'use client'

import { useMemo } from 'react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { LiveWebsiteEvent } from '@/app/(dashboard)/projects/[projectId]/studies/[studyId]/results/types'
import { displayPath } from './utils'
import type { RrwebPage } from './utils'

interface ReplayEventTimelineProps {
  events: LiveWebsiteEvent[]
  sessionStartTime: string
  sessionDuration: number
  pages?: RrwebPage[]
  sessionStartTimestamp?: number
}

const PAGE_SEGMENT_COLORS = [
  'bg-blue-100 dark:bg-blue-900/30',
  'bg-green-100 dark:bg-green-900/30',
  'bg-amber-100 dark:bg-amber-900/30',
  'bg-purple-100 dark:bg-purple-900/30',
  'bg-pink-100 dark:bg-pink-900/30',
  'bg-cyan-100 dark:bg-cyan-900/30',
]

export function ReplayEventTimeline({
  events,
  sessionStartTime,
  sessionDuration,
  pages,
  sessionStartTimestamp,
}: ReplayEventTimelineProps) {
  const startMs = new Date(sessionStartTime).getTime()

  const markers = useMemo(() => {
    if (sessionDuration <= 0) return []

    return events
      .filter(e => e.event_type === 'click' || e.event_type === 'page_view')
      .map(e => {
        const offsetMs = new Date(e.timestamp).getTime() - startMs
        const position = Math.max(0, Math.min(100, (offsetMs / sessionDuration) * 100))
        return {
          id: e.id,
          type: (e.event_type === 'page_view' ? 'navigation' : 'click') as 'click' | 'navigation',
          position,
          url: e.page_url,
          timestamp: e.timestamp,
        }
      })
  }, [events, startMs, sessionDuration])

  const pageSegments = useMemo(() => {
    if (!pages || pages.length === 0 || !sessionStartTimestamp || sessionDuration <= 0) return []

    return pages.map((page, i) => {
      const offsetMs = page.timestamp - sessionStartTimestamp
      const startPct = Math.max(0, Math.min(100, (offsetMs / sessionDuration) * 100))
      const nextPage = pages[i + 1]
      const endPct = nextPage
        ? Math.max(0, Math.min(100, ((nextPage.timestamp - sessionStartTimestamp) / sessionDuration) * 100))
        : 100
      const widthPct = Math.max(0, endPct - startPct)

      return {
        url: page.url,
        startPct,
        widthPct,
        colorClass: PAGE_SEGMENT_COLORS[i % PAGE_SEGMENT_COLORS.length],
      }
    })
  }, [pages, sessionStartTimestamp, sessionDuration])

  if (sessionDuration <= 0) return null

  const clicks = markers.filter(m => m.type === 'click')
  const navigations = markers.filter(m => m.type === 'navigation')

  return (
    <TooltipProvider delayDuration={200}>
      <div className="rounded-md border bg-muted/20 p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground">Event Timeline</span>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {pageSegments.length > 0 && (
              <span className="flex items-center gap-1">
                <span className="inline-block w-3 h-2 rounded-sm bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800" />
                Pages
              </span>
            )}
            <span className="flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-full bg-blue-500" />
              Clicks ({clicks.length})
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-0.5 h-3 bg-amber-500" />
              Navigations ({navigations.length})
            </span>
          </div>
        </div>

        <div className="relative h-6 bg-muted/30 rounded-sm overflow-hidden">
          {pageSegments.map((seg, i) => (
            <Tooltip key={`seg-${i}`}>
              <TooltipTrigger asChild>
                <div
                  className={`absolute top-0 bottom-0 ${seg.colorClass} cursor-pointer`}
                  style={{ left: `${seg.startPct}%`, width: `${seg.widthPct}%` }}
                />
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs max-w-xs">
                {displayPath(seg.url, 40)}
              </TooltipContent>
            </Tooltip>
          ))}

          {navigations.map(m => (
            <Tooltip key={m.id}>
              <TooltipTrigger asChild>
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-amber-500 cursor-pointer hover:bg-amber-400 z-10"
                  style={{ left: `${m.position}%` }}
                />
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs max-w-xs">
                {m.url ? displayPath(m.url, 40) : 'Page navigation'}
              </TooltipContent>
            </Tooltip>
          ))}

          {clicks.map(m => (
            <Tooltip key={m.id}>
              <TooltipTrigger asChild>
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-blue-500 cursor-pointer hover:bg-blue-400 z-20"
                  style={{ left: `${m.position}%` }}
                />
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                Click
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </div>
    </TooltipProvider>
  )
}
