'use client'

import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import {
  Monitor,
  Smartphone,
  Tablet,
  Clock,
  MousePointerClick,
  Eye,
  ArrowDownUp,
  Zap,
  ChevronDown,
  ChevronRight,
  ExternalLink,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatDuration, parseUserAgent, extractActivityFromRrwebEvents, computePageDurations, displayPath } from './utils'
import type { RrwebPage } from './utils'

interface SessionInfoSidebarProps {
  metadata: {
    session_id: string
    started_at: string
    ended_at: string | null
    duration_ms: number | null
    event_count: number
    viewport_width: number | null
    viewport_height: number | null
    user_agent: string | null
    computed_duration_ms: number | null
  }
  pages: RrwebPage[]
  rrwebEvents: any[]
  sessionStartTimestamp: number
  sessionDuration: number
  onSeekToPage?: (timestamp: number) => void
}

function DeviceIcon({ deviceType, className }: { deviceType: string; className?: string }) {
  switch (deviceType) {
    case 'Mobile': return <Smartphone className={className} />
    case 'Tablet': return <Tablet className={className} />
    default: return <Monitor className={className} />
  }
}

function CollapsibleSection({
  title,
  badge,
  defaultOpen = true,
  children,
}: {
  title: string
  badge?: string | number
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-3 text-sm font-medium hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          <span>{title}</span>
        </div>
        {badge !== undefined && (
          <Badge variant="secondary" className="text-xs">{badge}</Badge>
        )}
      </button>
      {open && <div className="border-t">{children}</div>}
    </div>
  )
}

function InfoRow({ label, value }: { label: React.ReactNode; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground flex items-center gap-1.5">{label}</span>
      <span>{value}</span>
    </div>
  )
}

const PAGE_COLORS = ['bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-purple-500', 'bg-pink-500', 'bg-cyan-500']

export function SessionInfoSidebar({
  metadata,
  pages,
  rrwebEvents,
  sessionStartTimestamp,
  sessionDuration,
  onSeekToPage,
}: SessionInfoSidebarProps) {
  const ua = useMemo(() => parseUserAgent(metadata.user_agent), [metadata.user_agent])
  const duration = metadata.computed_duration_ms ?? metadata.duration_ms

  const activityStats = useMemo(
    () => extractActivityFromRrwebEvents(rrwebEvents),
    [rrwebEvents]
  )

  const pagesWithDuration = useMemo(
    () => computePageDurations(pages, sessionStartTimestamp, sessionDuration),
    [pages, sessionStartTimestamp, sessionDuration]
  )

  return (
    <div className="w-72 shrink-0 space-y-3">
      <CollapsibleSection title="Session Info">
        <div className="p-3 space-y-2.5 text-sm">
          <InfoRow
            label={<><Clock className="h-3.5 w-3.5" /> Duration</>}
            value={<span className="font-medium tabular-nums">{formatDuration(duration)}</span>}
          />
          <InfoRow label="Started" value={<span className="text-xs">{format(new Date(metadata.started_at), 'MMM d, h:mm a')}</span>} />
          <InfoRow label="Browser" value={ua.browser} />
          <InfoRow label="OS" value={ua.os} />
          <InfoRow
            label="Device"
            value={<span className="flex items-center gap-1.5"><DeviceIcon deviceType={ua.deviceType} className="h-3.5 w-3.5" />{ua.deviceType}</span>}
          />
          {metadata.viewport_width && metadata.viewport_height && (
            <InfoRow label="Viewport" value={<span className="tabular-nums">{metadata.viewport_width} x {metadata.viewport_height}</span>} />
          )}
          <InfoRow
            label="Status"
            value={
              <span className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${metadata.ended_at ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                {metadata.ended_at ? 'Completed' : 'Recording'}
              </span>
            }
          />
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Activity">
        <div className="px-3 py-2 flex items-center gap-3 text-xs flex-wrap">
          <span className="flex items-center gap-1 text-muted-foreground">
            <MousePointerClick className="h-3 w-3 text-blue-500" />
            <span className="font-medium text-foreground tabular-nums">{activityStats.clicks}</span> Clicks
          </span>
          <span className="text-muted-foreground/40">|</span>
          <span className="flex items-center gap-1 text-muted-foreground">
            <Eye className="h-3 w-3 text-emerald-500" />
            <span className="font-medium text-foreground tabular-nums">{activityStats.pageViews}</span> Pages
          </span>
          <span className="text-muted-foreground/40">|</span>
          <span className="flex items-center gap-1 text-muted-foreground">
            <ArrowDownUp className="h-3 w-3 text-purple-500" />
            <span className="font-medium text-foreground tabular-nums">{activityStats.scrolls}</span> Scrolls
          </span>
          {activityStats.rageClicks > 0 && (
            <>
              <span className="text-muted-foreground/40">|</span>
              <span className="flex items-center gap-1 text-red-500">
                <Zap className="h-3 w-3" />
                <span className="font-medium tabular-nums">{activityStats.rageClicks}</span> Rage
              </span>
            </>
          )}
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Pages Visited" badge={pages.length}>
        <div className="max-h-64 overflow-y-auto">
          {pagesWithDuration.length === 0 ? (
            <p className="text-xs text-muted-foreground p-3">No page data available</p>
          ) : (
            <div className="divide-y">
              {pagesWithDuration.map((page, i) => (
                <button
                  key={`${page.url}-${i}`}
                  onClick={() => onSeekToPage?.(page.timestamp)}
                  className="w-full text-left px-3 py-2 hover:bg-muted/30 transition-colors group"
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${PAGE_COLORS[i % PAGE_COLORS.length]}`} />
                    <span className="font-mono text-xs truncate flex-1">
                      {displayPath(page.url)}
                    </span>
                    <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0" />
                  </div>
                  <div className="text-xs text-muted-foreground ml-4 mt-0.5 tabular-nums">
                    {formatDuration(page.elapsedMs)} elapsed
                    {page.durationMs > 0 && <> · {formatDuration(page.durationMs)} on page</>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </CollapsibleSection>
    </div>
  )
}
