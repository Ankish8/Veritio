'use client'

import { useMemo, useState, useCallback, memo } from 'react'
import { Play, Pause, Mic, FileText, Search, Loader2, AlertCircle, Clock, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { cn } from '@/lib/utils'
import { useRecording } from '@/hooks/use-recording'
import { createParticipantNumberMap } from '@/lib/utils/participant-utils'
import type { StudyFlowQuestionRow, StudyFlowResponseRow, Participant } from '@veritio/study-types'
import type { AudioResponseValue } from '@veritio/study-types/study-flow-types'

interface AudioResponseVisualizationProps {
  question: StudyFlowQuestionRow
  responses: StudyFlowResponseRow[]
  participants: Participant[]
  filteredParticipantIds: Set<string> | null
}

export function AudioResponseVisualization({
  question,
  responses,
  participants,
  filteredParticipantIds,
}: AudioResponseVisualizationProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedResponseId, setExpandedResponseId] = useState<string | null>(null)

  const participantNumberMap = useMemo(() =>
    createParticipantNumberMap(participants),
    [participants]
  )

  const audioResponses = useMemo(() => {
    return responses
      .filter(r => {
        if (filteredParticipantIds && !filteredParticipantIds.has(r.participant_id)) {
          return false
        }
        const value = r.response_value as unknown as AudioResponseValue | null
        return value?.recordingId
      })
      .map(r => {
        const value = r.response_value as unknown as AudioResponseValue
        const participant = participants.find(p => p.id === r.participant_id)
        const participantNumber = participantNumberMap.get(r.participant_id) || 0
        return {
          id: r.id,
          participantId: r.participant_id,
          participantNumber,
          participantEmail: (participant as { email?: string | null })?.email || null,
          recordingId: value.recordingId,
          responseId: value.responseId,
          durationMs: value.durationMs,
          createdAt: r.created_at || new Date().toISOString(),
        }
      })
  }, [responses, participants, participantNumberMap, filteredParticipantIds])

  const filteredResponses = useMemo(() => {
    if (!searchQuery) return audioResponses
    return audioResponses
  }, [audioResponses, searchQuery])

  if (audioResponses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Mic className="h-12 w-12 text-muted-foreground/30 mb-4" />
        <p className="text-sm text-muted-foreground">No audio responses recorded</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search transcripts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>{audioResponses.length} audio response{audioResponses.length !== 1 ? 's' : ''}</span>
        <span>·</span>
        <span>
          Total duration: {formatTotalDuration(audioResponses.reduce((sum, r) => sum + r.durationMs, 0))}
        </span>
      </div>

      <div className="space-y-3">
        {filteredResponses.map((response) => (
          <AudioResponseCard
            key={response.id}
            response={response}
            studyId={question.study_id}
            searchQuery={searchQuery}
            isExpanded={expandedResponseId === response.id}
            onToggleExpand={() => setExpandedResponseId(
              expandedResponseId === response.id ? null : response.id
            )}
          />
        ))}
      </div>
    </div>
  )
}

interface AudioResponseCardProps {
  response: {
    id: string
    participantId: string
    participantNumber: number
    participantEmail: string | null
    recordingId: string
    responseId: string
    durationMs: number
    createdAt: string
  }
  studyId: string
  searchQuery: string
  isExpanded: boolean
  onToggleExpand: () => void
}

const AudioResponseCard = memo(function AudioResponseCard({
  response,
  studyId,
  searchQuery,
  isExpanded,
  onToggleExpand,
}: AudioResponseCardProps) {
  const { recording, isLoading, error, getPlaybackUrl } = useRecording(studyId, response.recordingId)
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null)
  const [isLoadingUrl, setIsLoadingUrl] = useState(false)

  const matchesSearch = useMemo(() => {
    if (!searchQuery || !recording?.transcript?.full_text) return true
    return recording.transcript.full_text.toLowerCase().includes(searchQuery.toLowerCase())
  }, [searchQuery, recording?.transcript?.full_text])

  if (searchQuery && !matchesSearch) {
    return null
  }

  const handleExpand = async () => {
    onToggleExpand()
    if (!isExpanded && !playbackUrl) {
      setIsLoadingUrl(true)
      try {
        const url = await getPlaybackUrl()
        setPlaybackUrl(url)
      } catch {
        // Error handled by recording hook
      } finally {
        setIsLoadingUrl(false)
      }
    }
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={handleExpand}
        className={cn(
          "w-full flex items-center gap-4 p-4 text-left hover:bg-muted/50 transition-colors",
          isExpanded && "bg-muted/30"
        )}
      >
        <div className="flex items-center gap-2 min-w-[140px]">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-4 w-4 text-primary" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium">
              Participant {response.participantNumber}
            </span>
            {response.participantEmail && (
              <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                {response.participantEmail}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          <span className="text-sm font-mono">{formatDuration(response.durationMs)}</span>
        </div>

        <div className="flex items-center gap-2 flex-1 justify-end">
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : error ? (
            <Badge variant="destructive" className="text-xs">Error</Badge>
          ) : recording?.has_transcript ? (
            <Badge variant="secondary" className="text-xs flex items-center gap-1">
              <FileText className="h-3 w-3" />
              {recording.transcript_word_count || 0} words
            </Badge>
          ) : recording?.transcript_status === 'no_speech_detected' ? (
            <Badge variant="outline" className="text-xs">No speech</Badge>
          ) : recording?.transcript_status === 'processing' || recording?.transcript_status === 'pending' ? (
            <Badge variant="outline" className="text-xs flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Transcribing
            </Badge>
          ) : null}

          <Mic className={cn(
            "h-4 w-4 transition-transform",
            isExpanded ? "text-primary" : "text-muted-foreground"
          )} />
        </div>
      </button>

      {isExpanded && (
        <div className="border-t bg-muted/20 p-4 space-y-4">
          {isLoadingUrl ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : playbackUrl ? (
            <MiniAudioPlayer url={playbackUrl} />
          ) : error ? (
            <div className="flex items-center gap-2 text-destructive text-sm py-2">
              <AlertCircle className="h-4 w-4" />
              <span>Failed to load audio</span>
            </div>
          ) : null}

          {recording?.transcript?.full_text ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <FileText className="h-4 w-4" />
                Transcript
              </div>
              <div className="bg-background rounded-lg p-3 text-sm leading-relaxed">
                {searchQuery ? (
                  <HighlightedText text={recording.transcript.full_text} query={searchQuery} />
                ) : (
                  recording.transcript.full_text
                )}
              </div>
            </div>
          ) : recording?.transcript_status === 'no_speech_detected' ? (
            <p className="text-sm text-muted-foreground italic">
              No speech detected in this recording.
            </p>
          ) : null}
        </div>
      )}
    </div>
  )
})

function MiniAudioPlayer({ url }: { url: string }) {
  const audioRef = useCallback((node: HTMLAudioElement | null) => {
    if (node) {
      node.volume = 1
    }
  }, [])
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  const togglePlay = useCallback(() => {
    const audio = document.querySelector(`audio[src="${url}"]`) as HTMLAudioElement
    if (!audio) return

    if (isPlaying) {
      audio.pause()
    } else {
      audio.play().catch(() => {})
    }
  }, [isPlaying, url])

  const handleSeek = useCallback((value: number[]) => {
    const audio = document.querySelector(`audio[src="${url}"]`) as HTMLAudioElement
    if (!audio) return
    audio.currentTime = value[0]
    setCurrentTime(value[0])
  }, [url])

  return (
    <div className="flex items-center gap-3 bg-background rounded-lg p-3">
      <audio
        ref={audioRef}
        src={url}
        preload="metadata"
        onLoadedMetadata={(e) => {
          const audioDuration = e.currentTarget.duration
          if (isFinite(audioDuration) && !isNaN(audioDuration)) {
            setDuration(audioDuration)
          }
        }}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
      />

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={togglePlay}
      >
        {isPlaying ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4" />
        )}
      </Button>

      <span className="text-xs font-mono text-muted-foreground min-w-[40px]">
        {formatDuration(currentTime * 1000)}
      </span>

      <Slider
        value={[currentTime]}
        max={duration > 0 ? duration : 1}
        step={0.1}
        onValueChange={handleSeek}
        className="flex-1"
        disabled={!duration || duration === 0}
      />

      <span className="text-xs font-mono text-muted-foreground min-w-[40px]">
        {formatDuration(duration * 1000)}
      </span>
    </div>
  )
}

function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>

  const parts = text.split(new RegExp(`(${query})`, 'gi'))
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="bg-yellow-200 dark:bg-yellow-900 px-0.5 rounded">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  )
}

function formatDuration(ms: number): string {
  if (!isFinite(ms) || isNaN(ms) || ms < 0) {
    return '0:00'
  }

  const seconds = Math.floor(ms / 1000)
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function formatTotalDuration(ms: number): string {
  if (!isFinite(ms) || isNaN(ms) || ms < 0) {
    return '0m 0s'
  }

  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const mins = Math.floor((totalSeconds % 3600) / 60)
  const secs = totalSeconds % 60

  if (hours > 0) {
    return `${hours}h ${mins}m`
  }
  return `${mins}m ${secs}s`
}
