'use client'

/**
 * Public Recordings View
 *
 * Read-only recordings list for public shared results.
 * Uses pre-fetched recordings data with server-generated signed playback URLs.
 * No auth API calls needed — everything is passed as props.
 */

import { useMemo, useState, useCallback, useRef, useEffect } from 'react'
import { FileVideo, Mic, Monitor, Video, Clock, FileText, Search, Play, Pause, Volume2, VolumeX, Maximize } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { createParticipantNumberMap } from '@/lib/utils/participant-utils'

interface Recording {
  id: string
  participant_id: string
  scope: 'session' | 'task'
  task_attempt_id: string | null
  capture_mode: 'audio' | 'screen_audio' | 'screen_audio_webcam'
  duration_ms: number | null
  file_size_bytes: number | null
  status: string
  started_at: string | null
  completed_at: string | null
  created_at: string
  has_transcript: boolean
  transcript_status: string | null
  transcript_word_count: number | null
  playback_url: string | null
}

interface PublicRecordingsViewProps {
  studyId: string
  recordings: Recording[]
  participants?: any[]
  participantIds?: Set<string> | null
}

function formatDuration(ms: number | null): string {
  if (!ms) return '-'
  const seconds = Math.floor(ms / 1000)
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

const CAPTURE_MODE_ICONS: Record<string, typeof Mic> = {
  audio: Mic,
  screen_audio: Monitor,
  screen_audio_webcam: Video,
}

const CAPTURE_MODE_LABELS: Record<string, string> = {
  audio: 'Audio',
  screen_audio: 'Screen + Audio',
  screen_audio_webcam: 'Screen + Audio + Webcam',
}

/** Simple video/audio player for public recordings */
function PublicPlayer({ recording }: { recording: Recording }) {
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isMuted, setIsMuted] = useState(false)

  useEffect(() => {
    setIsPlaying(false) // eslint-disable-line react-hooks/set-state-in-effect
    setCurrentTime(0)
    setDuration(0)
  }, [recording.id])

  const togglePlay = useCallback(() => {
    const el = mediaRef.current
    if (!el) return
    if (el.paused) {
      el.play()
      setIsPlaying(true)
    } else {
      el.pause()
      setIsPlaying(false)
    }
  }, [])

  const handleTimeUpdate = useCallback(() => {
    if (mediaRef.current) setCurrentTime(mediaRef.current.currentTime)
  }, [])

  const handleLoadedMetadata = useCallback(() => {
    if (mediaRef.current) setDuration(mediaRef.current.duration)
  }, [])

  const handleSeek = useCallback((value: number[]) => {
    if (mediaRef.current) {
      mediaRef.current.currentTime = value[0]
      setCurrentTime(value[0])
    }
  }, [])

  const toggleMute = useCallback(() => {
    if (mediaRef.current) {
      mediaRef.current.muted = !mediaRef.current.muted
      setIsMuted(!isMuted)
    }
  }, [isMuted])

  const handleFullscreen = useCallback(() => {
    if (mediaRef.current && mediaRef.current instanceof HTMLVideoElement) {
      mediaRef.current.requestFullscreen?.()
    }
  }, [])

  if (!recording.playback_url) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <FileVideo className="h-12 w-12 text-muted-foreground/40 mb-4" />
        <p className="text-sm text-muted-foreground">Playback URL not available</p>
      </div>
    )
  }

  const isAudioOnly = recording.capture_mode === 'audio'

  return (
    <div className="flex flex-col h-full">
      {/* Media element */}
      <div className="flex-1 bg-black flex items-center justify-center min-h-0">
        {isAudioOnly ? (
          <div className="flex flex-col items-center gap-4">
            <div className="h-24 w-24 rounded-full bg-muted/20 flex items-center justify-center">
              <Mic className="h-10 w-10 text-white/60" />
            </div>
            <audio
              ref={mediaRef as React.RefObject<HTMLAudioElement>}
              src={recording.playback_url}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onEnded={() => setIsPlaying(false)}
            />
          </div>
        ) : (
          <video
            ref={mediaRef as React.RefObject<HTMLVideoElement>}
            src={recording.playback_url}
            className="max-h-full max-w-full"
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={() => setIsPlaying(false)}
            onClick={togglePlay}
          />
        )}
      </div>

      {/* Controls */}
      <div className="p-3 border-t bg-card space-y-2">
        <Slider
          value={[currentTime]}
          max={duration || 1}
          step={0.1}
          onValueChange={handleSeek}
          className="w-full"
        />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={togglePlay}>
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleMute}>
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>
            <span className="text-xs text-muted-foreground">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>
          {!isAudioOnly && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleFullscreen}>
              <Maximize className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function PublicRecordingsView({
  studyId: _studyId,
  recordings,
  participants,
  participantIds,
}: PublicRecordingsViewProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRecordingId, setSelectedRecordingId] = useState<string | null>(null)

  const participantNumberMap = useMemo(() => {
    if (participants && participants.length > 0) {
      return createParticipantNumberMap(participants)
    }
    return new Map<string, number>()
  }, [participants])

  const filteredRecordings = useMemo(() => {
    let filtered = recordings.filter(r => r.status === 'completed' || r.status === 'ready' || r.status === 'transcribing')
    if (participantIds) {
      filtered = filtered.filter(r => participantIds.has(r.participant_id))
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(r => {
        const pNum = participantNumberMap.get(r.participant_id) || 0
        return `p${pNum}`.includes(q) || `participant ${pNum}`.includes(q)
      })
    }
    return filtered
  }, [recordings, participantIds, searchQuery, participantNumberMap])

  const selectedRecording = useMemo(
    () => filteredRecordings.find(r => r.id === selectedRecordingId) || null,
    [filteredRecordings, selectedRecordingId]
  )

  const handleSelect = useCallback((recording: Recording) => {
    setSelectedRecordingId(recording.id)
  }, [])

  if (recordings.length === 0) {
    return (
      <div className="rounded-lg border bg-card shadow-sm">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FileVideo className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-medium mb-2">No recordings yet</h3>
          <p className="text-sm text-muted-foreground">Recordings will appear here once participants complete the study</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-4 h-[600px]">
      {/* Recording List */}
      <div className="w-80 flex-shrink-0 rounded-lg border bg-card shadow-sm flex flex-col">
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search participants..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {filteredRecordings.length} recording{filteredRecordings.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filteredRecordings.map((recording) => {
            const pNum = participantNumberMap.get(recording.participant_id) || 0
            const CaptureIcon = CAPTURE_MODE_ICONS[recording.capture_mode] || FileVideo
            const isActive = recording.id === selectedRecordingId
            return (
              <button
                key={recording.id}
                onClick={() => handleSelect(recording)}
                className={`w-full text-left p-3 border-b last:border-b-0 transition-colors hover:bg-muted/50 ${
                  isActive ? 'bg-muted border-l-2 border-l-primary' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm">P{pNum}</span>
                  <Badge variant="outline" className="text-xs">
                    {recording.scope === 'session' ? 'Session' : 'Task'}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CaptureIcon className="h-3 w-3" />
                  <span>{CAPTURE_MODE_LABELS[recording.capture_mode] || recording.capture_mode}</span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDuration(recording.duration_ms)}
                  </span>
                  {recording.has_transcript && (
                    <span className="flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      Transcript
                    </span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Player Panel */}
      <div className="flex-1 rounded-lg border bg-card shadow-sm overflow-hidden">
        {selectedRecording ? (
          <PublicPlayer recording={selectedRecording} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <FileVideo className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <p className="text-sm text-muted-foreground">Select a recording to play</p>
          </div>
        )}
      </div>
    </div>
  )
}
