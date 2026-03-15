'use client'

import { useState, useMemo } from 'react'
import { format } from 'date-fns'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@veritio/ui'
import { Search, Monitor, Smartphone, Tablet, FileText } from 'lucide-react'
import {
  resolveParticipantDisplay,
  extractDemographicsFromMetadata,
} from '@/lib/utils/participant-display'
import { formatDuration, parseUserAgent } from './utils'
import type { LiveWebsiteRrwebSession } from '@/app/(dashboard)/projects/[projectId]/studies/[studyId]/results/types'
import type { Participant } from '@veritio/study-types'
import type { ParticipantDisplaySettings } from '@veritio/study-types/study-flow-types'

interface SessionListProps {
  sessions: LiveWebsiteRrwebSession[]
  selectedSessionId: string | null
  onSelectSession: (id: string) => void
  participants: Participant[]
  displaySettings?: ParticipantDisplaySettings | null
  isLoading: boolean
}

function DeviceIcon({ deviceType, className }: { deviceType: string; className?: string }) {
  switch (deviceType) {
    case 'Mobile': return <Smartphone className={className} />
    case 'Tablet': return <Tablet className={className} />
    default: return <Monitor className={className} />
  }
}

export function SessionList({
  sessions,
  selectedSessionId,
  onSelectSession,
  participants,
  displaySettings,
  isLoading,
}: SessionListProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const participantDisplayMap = useMemo(() => {
    const map = new Map<string, { primary: string; secondary: string | null }>()
    participants.forEach((p, i) => {
      const demographics = extractDemographicsFromMetadata(p.metadata)
      const display = resolveParticipantDisplay(displaySettings ?? null, {
        index: i + 1,
        demographics,
      })
      map.set(p.id, display)
    })
    return map
  }, [participants, displaySettings])

  const sortedSessions = useMemo(() => {
    return [...sessions].sort((a, b) =>
      new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
    )
  }, [sessions])

  const filteredSessions = useMemo(() => {
    if (!searchQuery.trim()) return sortedSessions
    const query = searchQuery.toLowerCase()
    return sortedSessions.filter(s => {
      if (s.participant_id) {
        const display = participantDisplayMap.get(s.participant_id)
        if (display) {
          if (display.primary.toLowerCase().includes(query)) return true
          if (display.secondary?.toLowerCase().includes(query)) return true
        }
      }
      const ua = parseUserAgent(s.user_agent)
      const dateStr = format(new Date(s.started_at), 'MMM d, yyyy h:mm a').toLowerCase()
      if (ua.browser.toLowerCase().includes(query)) return true
      if (ua.os.toLowerCase().includes(query)) return true
      if (dateStr.includes(query)) return true
      return false
    })
  }, [sortedSessions, searchQuery, participantDisplayMap])

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-9 w-full rounded-md" />
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-24 w-full rounded-lg" />
      </div>
    )
  }

  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-sm text-muted-foreground">No recorded sessions yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search sessions..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="pl-8"
        />
      </div>

      <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
        {filteredSessions.map(session => {
          const display = session.participant_id
            ? participantDisplayMap.get(session.participant_id)
            : null
          const isSelected = session.id === selectedSessionId
          const ua = parseUserAgent(session.user_agent)
          const startDate = new Date(session.started_at)

          return (
            <button
              key={session.id}
              onClick={() => onSelectSession(session.id)}
              className={`w-full text-left rounded-lg border p-3 transition-colors hover:bg-muted/50 ${
                isSelected ? 'bg-muted/40 border-primary/40' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-muted-foreground">
                  {format(startDate, 'MMM d, h:mm a')}
                </span>
                <Badge variant="secondary" className="text-xs shrink-0 ml-2 tabular-nums">
                  {formatDuration(session.duration_ms)}
                </Badge>
              </div>

              <div className="flex items-center gap-1.5 mb-1.5">
                <DeviceIcon deviceType={ua.deviceType} className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-sm font-medium truncate">
                  {session.user_agent ? `${ua.browser} on ${ua.os}` : 'Session recording'}
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <FileText className="h-3 w-3 shrink-0" />
                <span>
                  {Math.max(1, session.page_count)} page{session.page_count !== 1 ? 's' : ''}
                  {' \u00b7 '}
                  {session.event_count} events
                  {session.viewport_width && session.viewport_height && (
                    <> {'\u00b7'} {session.viewport_width}{'\u00d7'}{session.viewport_height}</>
                  )}
                </span>
              </div>

              {display && (
                <div className="mt-2 pt-2 border-t text-xs text-muted-foreground truncate">
                  {display.primary}
                  {display.secondary && ` \u2014 ${display.secondary}`}
                </div>
              )}
            </button>
          )
        })}

        {filteredSessions.length === 0 && searchQuery && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No sessions match your search
          </p>
        )}
      </div>
    </div>
  )
}
