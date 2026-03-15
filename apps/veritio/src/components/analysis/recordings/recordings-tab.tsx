'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Loader2, AlertCircle, FileVideo } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRecordings, type Recording } from '@/hooks/use-recordings'
import { toast } from '@/components/ui/sonner'
import { RecordingListPanel } from './recording-list-panel'
import { STATUS_CONFIG } from './recording-card'
import { prefetchPlaybackUrl } from '@/hooks/use-recording'
import { createParticipantNumberMap } from '@/lib/utils/participant-utils'
import { resolveParticipantDisplay, extractDemographicsFromMetadata } from '@/lib/utils/participant-display'
import type { Participant } from '@veritio/study-types'
import type { ParticipantDisplaySettings } from '@veritio/study-types/study-flow-types'

// Lazy load the player panel (contains heavy Vidstack video player)
const playerPanelImport = () => import('./recording-player-panel').then(m => ({ default: m.RecordingPlayerPanel }))
const RecordingPlayerPanel = dynamic(playerPanelImport, {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  ),
})
// Preload the chunk on hover so it's ready when user clicks
let _preloaded = false
const preloadPlayerPanel = () => {
  if (!_preloaded) {
    _preloaded = true
    playerPanelImport()
  }
}

export interface RecordingsTabProps {
  studyId: string
  participants?: Participant[]
  displaySettings?: ParticipantDisplaySettings | null
  onRecordingClick?: (recording: Recording) => void
  participantIds?: Set<string> | null
  excludedParticipantIds?: Set<string>
}

export function RecordingsTab({ studyId, participants, displaySettings, onRecordingClick, participantIds, excludedParticipantIds }: RecordingsTabProps) {
  const { recordings: allRecordings, isLoading, error, refetch, deleteRecording } = useRecordings(studyId)

  // Filter recordings by variant participant IDs and exclude excluded participants
  const recordings = useMemo(() => {
    let filtered = allRecordings
    if (excludedParticipantIds && excludedParticipantIds.size > 0) {
      filtered = filtered.filter(r => !excludedParticipantIds.has(r.participant_id))
    }
    if (participantIds) {
      filtered = filtered.filter(r => participantIds.has(r.participant_id))
    }
    return filtered
  }, [allRecordings, participantIds, excludedParticipantIds])

  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('newest')
  const [selectedRecordingId, setSelectedRecordingId] = useState<string | null>(null)

  // Create participant number mapping using global utility for consistency.
  // Merges server-provided participants with recording-derived participants
  // to handle the race condition where recordings load (SWR) before the
  // server-side participants data refreshes (10s polling).
  const participantNumberMap = useMemo(() => {
    const map = participants && participants.length > 0
      ? createParticipantNumberMap(participants)
      : new Map<string, number>()

    // Fill in any recording participant_ids not yet in the server-provided map
    // (new participants whose data hasn't been polled yet)
    const sortedRecordings = [...recordings].sort((a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
    let nextNumber = map.size > 0 ? Math.max(...map.values()) + 1 : 1
    for (const recording of sortedRecordings) {
      if (!map.has(recording.participant_id)) {
        map.set(recording.participant_id, nextNumber++)
      }
    }

    return map
  }, [participants, recordings])

  // Create participant lookup map for accessing metadata (demographics)
  const participantMap = useMemo(() => {
    const map = new Map<string, Participant>()
    participants?.forEach(p => map.set(p.id, p))
    return map
  }, [participants])

  // Filter recordings by participant name, email, or other demographics
  const filteredRecordings = useMemo(() => {
    const query = searchQuery.toLowerCase().trim()

    const filtered = recordings.filter((recording) => {
      // Status filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'has_transcript') {
          if ((recording.transcript_word_count ?? 0) <= 0) return false
        } else if (statusFilter === 'playable') {
          const config = STATUS_CONFIG[recording.status as keyof typeof STATUS_CONFIG]
          if (!config?.canPlay) return false
        } else if (recording.status !== statusFilter) {
          return false
        }
      }

      if (!query) return true

      const participant = participantMap.get(recording.participant_id)
      const demographics = extractDemographicsFromMetadata(participant?.metadata)
      const participantNumber = participantNumberMap.get(recording.participant_id) || 0

      const display = resolveParticipantDisplay(displaySettings, {
        index: participantNumber,
        demographics,
      })

      const searchFields = [
        display.primary,
        display.secondary,
        demographics?.email,
        demographics?.firstName,
        demographics?.lastName,
        `P${participantNumber}`,
        `Participant ${participantNumber}`,
      ].filter(Boolean).map(s => s!.toLowerCase())

      return searchFields.some(field => field.includes(query))
    })

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        case 'longest':
          return (b.duration_ms ?? 0) - (a.duration_ms ?? 0)
        case 'shortest':
          return (a.duration_ms ?? 0) - (b.duration_ms ?? 0)
        case 'newest':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
    })

    return filtered
  }, [recordings, searchQuery, statusFilter, sortBy, participantMap, participantNumberMap, displaySettings])

  // Derive selected recording from ID (use unfiltered list so player stays active during search/filter)
  const selectedRecording = useMemo(() => {
    if (!selectedRecordingId) return null
    return recordings.find(r => r.id === selectedRecordingId) || null
  }, [selectedRecordingId, recordings])

  // Playable recordings for keyboard navigation
  const playableRecordings = useMemo(() => {
    return filteredRecordings.filter(r => {
      const config = STATUS_CONFIG[r.status as keyof typeof STATUS_CONFIG]
      return config?.canPlay
    })
  }, [filteredRecordings])

  // Auto-select the first playable recording when recordings load
  const firstPlayableId = useMemo(() => {
    const first = recordings.find(r => {
      const config = STATUS_CONFIG[r.status as keyof typeof STATUS_CONFIG]
      return config?.canPlay
    })
    return first?.id ?? null
  }, [recordings])

  useEffect(() => {
    if (selectedRecordingId || !firstPlayableId) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedRecordingId(firstPlayableId)
    preloadPlayerPanel()
    prefetchPlaybackUrl(studyId, firstPlayableId)
  }, [firstPlayableId, selectedRecordingId, studyId])

  // Keyboard navigation (arrow up/down)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
      if (playableRecordings.length === 0) return
      // Don't intercept when focus is in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      e.preventDefault()
      const currentIndex = selectedRecordingId
        ? playableRecordings.findIndex(r => r.id === selectedRecordingId)
        : -1

      let nextIndex: number
      if (e.key === 'ArrowDown') {
        nextIndex = currentIndex < playableRecordings.length - 1 ? currentIndex + 1 : 0
      } else {
        nextIndex = currentIndex > 0 ? currentIndex - 1 : playableRecordings.length - 1
      }

      setSelectedRecordingId(playableRecordings[nextIndex].id)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [playableRecordings, selectedRecordingId])

  const handleDelete = useCallback(async (recordingId: string) => {
    try {
      await deleteRecording(recordingId)
      toast.success('Recording deleted successfully')
      if (selectedRecordingId === recordingId) {
        setSelectedRecordingId(null)
      }
      refetch()
    } catch (err) {
      toast.error('Failed to delete recording', {
        description: err instanceof Error ? err.message : 'Unknown error',
      })
    }
  }, [deleteRecording, refetch, selectedRecordingId])

  const handlePreload = useCallback((recordingId: string) => {
    preloadPlayerPanel()
    prefetchPlaybackUrl(studyId, recordingId)
  }, [studyId])

  const handleSelect = useCallback((recording: Recording) => {
    setSelectedRecordingId(recording.id)
    onRecordingClick?.(recording)
  }, [onRecordingClick])

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-2">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
          <p className="text-sm font-medium">Failed to load recordings</p>
          <p className="text-xs text-muted-foreground">{error}</p>
          <Button onClick={refetch} variant="outline" size="sm">Retry</Button>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (recordings.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-2">
          <FileVideo className="h-12 w-12 text-muted-foreground mx-auto" />
          <p className="text-sm font-medium">No recordings yet</p>
          <p className="text-xs text-muted-foreground">
            Recordings will appear here once participants complete the study
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-240px)] min-h-[400px] overflow-hidden">
      {/* Split view */}
      <div className="flex flex-row flex-1 min-h-0 border rounded-lg overflow-hidden">
        {/* Left: recording list */}
        <RecordingListPanel
          recordings={filteredRecordings}
          totalCount={recordings.length}
          selectedRecordingId={selectedRecordingId}
          participantMap={participantMap}
          participantNumberMap={participantNumberMap}
          displaySettings={displaySettings}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          sortBy={sortBy}
          onSortChange={setSortBy}
          onSelect={handleSelect}
          onPreload={handlePreload}
        />

        {/* Right: player or empty state */}
        {selectedRecording ? (
          <RecordingPlayerPanel
            key={selectedRecording.id}
            studyId={studyId}
            recording={selectedRecording}
            onDelete={handleDelete}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center space-y-2">
              <FileVideo className="h-12 w-12 mx-auto opacity-50" />
              <p className="text-sm">Select a recording to play</p>
              <p className="text-xs">Use arrow keys to navigate</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
