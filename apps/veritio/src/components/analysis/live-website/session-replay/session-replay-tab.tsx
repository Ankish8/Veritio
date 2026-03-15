'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { useRrwebSessions } from './use-rrweb-sessions'
import { useRrwebSessionData } from './use-rrweb-session-data'
import { SessionList } from './session-list'
import { PlayerUrlBar } from './player-url-bar'
import { SessionInfoSidebar } from './session-info-sidebar'
import { Skeleton } from '@veritio/ui'
import type { Participant } from '@veritio/study-types'
import type { ParticipantDisplaySettings } from '@veritio/study-types/study-flow-types'
import type { LiveWebsiteEvent, LiveWebsiteTask } from '@/app/(dashboard)/projects/[projectId]/studies/[studyId]/results/types'

const ReplayPlayer = dynamic(() => import('./replay-player'), { ssr: false })

interface SessionReplayTabProps {
  studyId: string
  events: LiveWebsiteEvent[]
  tasks: LiveWebsiteTask[]
  participants: Participant[]
  filteredParticipantIds?: Set<string> | null
  displaySettings?: ParticipantDisplaySettings | null
}

export function SessionReplayTab({ studyId, participants, filteredParticipantIds, displaySettings }: SessionReplayTabProps) {
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const [playerInstance, setPlayerInstance] = useState<any>(null)
  const [currentTimeMs, setCurrentTimeMs] = useState(0)
  const rafRef = useRef<number>(0)

  const { sessions, isLoading: sessionsLoading } = useRrwebSessions(studyId)
  const { sessionData, isLoading: dataLoading } = useRrwebSessionData(studyId, selectedSessionId)

  const filteredSessions = filteredParticipantIds
    ? sessions.filter(s => s.participant_id && filteredParticipantIds.has(s.participant_id))
    : sessions

  useEffect(() => {
    if (!playerInstance) {
      setCurrentTimeMs(0) // eslint-disable-line react-hooks/set-state-in-effect
      return
    }

    const tick = () => {
      try {
        const replayer = playerInstance.getReplayer?.()
        if (replayer) {
          setCurrentTimeMs(replayer.getCurrentTime?.() ?? 0)
        }
      } catch {
        // Player may be destroyed
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [playerInstance])

  useEffect(() => {
    setPlayerInstance(null) // eslint-disable-line react-hooks/set-state-in-effect
    setCurrentTimeMs(0)
  }, [selectedSessionId])

  const handlePlayerReady = useCallback((player: any) => {
    setPlayerInstance(player)
  }, [])

  const handleSeekToPage = useCallback((timestamp: number) => {
    if (!playerInstance || !sessionData) return
    const sessionStartTimestamp = sessionData.events[0]?.timestamp ?? 0
    const offsetMs = timestamp - sessionStartTimestamp
    try {
      const replayer = playerInstance.getReplayer?.()
      if (replayer) {
        replayer.play(Math.max(0, offsetMs))
      }
    } catch {
      // Player may not support seeking
    }
  }, [playerInstance, sessionData])

  const sessionStartTimestamp = sessionData?.events[0]?.timestamp ?? 0
  const effectiveDuration = sessionData?.metadata.computed_duration_ms ?? sessionData?.metadata.duration_ms ?? 0

  function renderPlayerPanel() {
    if (!selectedSessionId) {
      return (
        <div className="flex items-center justify-center h-full rounded-lg border bg-muted/30">
          <p className="text-muted-foreground">Select a session to replay</p>
        </div>
      )
    }
    if (dataLoading) {
      return <Skeleton className="w-full aspect-video rounded-lg" />
    }
    if (!sessionData) {
      return (
        <div className="flex items-center justify-center h-full rounded-lg border bg-muted/30">
          <p className="text-muted-foreground">Failed to load session data</p>
        </div>
      )
    }
    return (
      <div>
        <PlayerUrlBar
          pages={sessionData.pages}
          currentTimeMs={currentTimeMs}
          sessionStartTimestamp={sessionStartTimestamp}
        />
        <ReplayPlayer
          events={sessionData.events}
          width={sessionData.metadata.viewport_width || undefined}
          height={sessionData.metadata.viewport_height || undefined}
          onPlayerReady={handlePlayerReady}
        />
      </div>
    )
  }

  if (sessions.length === 0 && !sessionsLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="text-muted-foreground mb-2 text-lg font-medium">No recorded sessions</div>
        <p className="text-sm text-muted-foreground max-w-md">
          Session recordings will appear here once participants visit your site with the snippet or proxy tracking enabled.
        </p>
      </div>
    )
  }

  return (
    <div className="flex gap-6 min-h-[600px]">
      <div className="w-72 shrink-0">
        <SessionList
          sessions={filteredSessions}
          selectedSessionId={selectedSessionId}
          onSelectSession={setSelectedSessionId}
          participants={participants}
          displaySettings={displaySettings}
          isLoading={sessionsLoading}
        />
      </div>

      <div className="flex-1 min-w-0">
        {renderPlayerPanel()}
      </div>

      {selectedSessionId && sessionData && (
        <SessionInfoSidebar
          metadata={sessionData.metadata}
          pages={sessionData.pages}
          rrwebEvents={sessionData.events}
          sessionStartTimestamp={sessionStartTimestamp}
          sessionDuration={effectiveDuration}
          onSeekToPage={handleSeekToPage}
        />
      )}
    </div>
  )
}
