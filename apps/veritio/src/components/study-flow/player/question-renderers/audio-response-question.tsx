'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Mic, Square, Pause, Play, RefreshCw, Check, Loader2, AlertCircle, Volume2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import {
  useQuestionRecording,
  formatDuration,
  formatDurationWithMax,
  type QuestionRecordingState,
} from '@/hooks/use-question-recording'
import { useLiveTranscription } from '@/hooks/use-live-transcription'
import type {
  AudioResponseQuestionConfig,
  AudioResponseValue,
} from '@veritio/study-types/study-flow-types'

interface AudioResponseQuestionProps {
  config: AudioResponseQuestionConfig
  value: AudioResponseValue | undefined
  onChange: (value: AudioResponseValue) => void
  studyId: string
  participantId: string
  sessionToken: string
  showKeyboardHints?: boolean
  onSelectionComplete?: () => void
}

function RecordingWaveform({ isRecording }: { isRecording: boolean }) {
  return (
    <div className="flex items-center justify-center gap-1 h-12">
      {[...Array(12)].map((_, i) => (
        <div
          key={i}
          className={cn(
            'w-1 rounded-full bg-primary transition-all duration-150',
            isRecording ? 'animate-pulse' : ''
          )}
          style={{
            height: isRecording ? `${20 + Math.random() * 24}px` : '4px', // eslint-disable-line react-hooks/purity
            animationDelay: `${i * 50}ms`,
          }}
        />
      ))}
    </div>
  )
}

function StateIndicator({ state }: { state: QuestionRecordingState }) {
  const indicators: Record<QuestionRecordingState, { icon: React.ReactNode; text: string; className: string }> = {
    idle: { icon: <Mic className="h-5 w-5" />, text: 'Ready to record', className: 'text-muted-foreground' },
    requesting: { icon: <Loader2 className="h-5 w-5 animate-spin" />, text: 'Requesting permission...', className: 'text-muted-foreground' },
    recording: { icon: <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />, text: 'Recording', className: 'text-red-500' },
    paused: { icon: <Pause className="h-5 w-5" />, text: 'Paused', className: 'text-yellow-500' },
    review: { icon: <Check className="h-5 w-5" />, text: 'Recording complete', className: 'text-green-500' },
    uploading: { icon: <Loader2 className="h-5 w-5 animate-spin" />, text: 'Uploading...', className: 'text-muted-foreground' },
    complete: { icon: <Check className="h-5 w-5" />, text: 'Saved', className: 'text-green-500' },
    error: { icon: <AlertCircle className="h-5 w-5" />, text: 'Error', className: 'text-destructive' },
  }

  const { icon, text, className } = indicators[state]

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {icon}
      <span className="text-sm font-medium">{text}</span>
    </div>
  )
}

export function AudioResponseQuestion({
  config,
  value,
  onChange,
  studyId,
  participantId,
  sessionToken,
}: AudioResponseQuestionProps) {
  const maxDurationMs = (config.maxDurationSeconds ?? 120) * 1000
  const minDurationMs = (config.minDurationSeconds ?? 0) * 1000
  const allowRerecord = config.allowRerecord ?? true

  // Validate session data - ensure we have all required IDs
  // Also reject 'pending' as it's not a valid UUID
  const hasValidSession = studyId && participantId && participantId !== 'pending' && sessionToken
  const isPreviewMode = sessionToken === 'preview-token'

  // Track if we've already saved a response
  const [hasRecorded, setHasRecorded] = useState(!!value)
  const [isPlaying, setIsPlaying] = useState(false)
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const {
    state,
    durationMs,
    canStop,
    recordingId,
    error,
    startRecording: startQuestionRecording,
    pauseRecording,
    resumeRecording,
    stopRecording: stopQuestionRecording,
    resetRecording: resetQuestionRecording,
  } = useQuestionRecording({
    studyId,
    participantId,
    sessionToken,
    maxDurationMs,
    minDurationMs,
    onComplete: (result) => {
      // Update the response value
      onChange({
        recordingId: result.recordingId,
        responseId: result.responseId,
        durationMs: result.durationMs,
      })
      setHasRecorded(true)
      // Stop live transcription and save transcript
      if (recordingId) {
        liveTranscription.saveTranscript(recordingId).catch(() => {})
      }
    },
    onError: () => {},
  })

  // Live transcription hook
  const liveTranscription = useLiveTranscription({
    mediaStream,
    enabled: state === 'recording' && !!mediaStream,
    studyId,
    participantId,
    sessionToken,
    recordingId: recordingId ?? undefined,
  })

  // Calculate progress percentage
  const progressPercent = Math.min((durationMs / maxDurationMs) * 100, 100)

  // Wrapper to start recording and capture media stream
  const startRecording = useCallback(async () => {
    // Validate session before starting
    if (!hasValidSession) {
      alert('Session not ready. Please wait a moment and try again.')
      return
    }

    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      setMediaStream(stream)
      await startQuestionRecording()
    } catch {
      // Microphone access denied or unavailable
    }
  }, [startQuestionRecording, hasValidSession, studyId, participantId, sessionToken]) // eslint-disable-line react-hooks/exhaustive-deps

  // Wrapper to stop recording and clean up stream
  const stopRecording = useCallback(() => {
    stopQuestionRecording()
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop())
      setMediaStream(null)
    }
  }, [stopQuestionRecording, mediaStream])

  // Wrapper to reset recording
  const resetRecording = useCallback(() => {
    resetQuestionRecording()
    liveTranscription.clearSegments()
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop())
      setMediaStream(null)
    }
  }, [resetQuestionRecording, liveTranscription, mediaStream])

  // Handle re-record
  const handleRerecord = useCallback(() => {
    resetRecording()
    setHasRecorded(false)
  }, [resetRecording])

  // Handle playback
  const handlePlayback = useCallback(async () => {
    if (!recordingId || isPreviewMode) return

    try {
      setIsPlaying(true)
      const response = await fetch(`/api/recordings/${recordingId}/playback-url`, {
        method: 'GET',
        headers: {
          'X-Session-Token': sessionToken,
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to get playback URL')
      }

      const { playback_url } = await response.json()

      if (!audioRef.current) {
        audioRef.current = new Audio(playback_url)
        audioRef.current.onended = () => setIsPlaying(false)
        audioRef.current.onerror = () => {
          setIsPlaying(false)
        }
      } else {
        audioRef.current.src = playback_url
      }

      await audioRef.current.play()
    } catch {
      setIsPlaying(false)
    }
  }, [recordingId, sessionToken, isPreviewMode])

  // Stop playback
  const stopPlayback = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      setIsPlaying(false)
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop())
      }
      if (audioRef.current) {
        audioRef.current.pause()
      }
    }
  }, [mediaStream])

  // Render based on state
  const renderContent = () => {
    // Check for valid session data first (unless already has recorded value)
    if (!hasValidSession && !hasRecorded) {
      return (
        <div className="flex flex-col items-center gap-4 py-6">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
            <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
          </div>
          <p className="text-sm text-muted-foreground">Initializing session...</p>
        </div>
      )
    }

    // If we have a saved recording and are in idle/review/complete state
    if (hasRecorded && (state === 'idle' || state === 'review' || state === 'complete')) {
      return (
        <div className="flex flex-col items-center gap-4 py-6">
          <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
            <Check className="h-8 w-8 text-green-500" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium">Recording saved</p>
            <p className="text-xs text-muted-foreground mt-1">
              Duration: {formatDuration(value?.durationMs ?? durationMs)}
            </p>
          </div>

          {/* Show transcript if available */}
          {liveTranscription.fullTranscript && (
            <div className="w-full max-w-md p-4 bg-muted/50 rounded-lg border">
              <p className="text-xs font-medium text-muted-foreground mb-2">Transcript:</p>
              <p className="text-sm text-foreground leading-relaxed">
                {liveTranscription.fullTranscript}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                {liveTranscription.wordCount} words
              </p>
            </div>
          )}

          <div className="flex items-center gap-3">
            {/* Playback button */}
            {recordingId && (
              <Button
                variant={isPlaying ? 'default' : 'outline'}
                size="sm"
                onClick={isPlaying ? stopPlayback : handlePlayback}
                className="gap-2"
              >
                <Volume2 className="h-4 w-4" />
                {isPlaying ? 'Stop' : 'Play'}
              </Button>
            )}

            {/* Re-record button */}
            {allowRerecord && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRerecord}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Re-record
              </Button>
            )}
          </div>
        </div>
      )
    }

    // Idle state - show start button
    if (state === 'idle') {
      return (
        <div className="flex flex-col items-center gap-4 py-6">
          <button
            onClick={startRecording}
            disabled={!hasValidSession}
            className={cn(
              "w-20 h-20 rounded-full flex items-center justify-center transition-all",
              hasValidSession
                ? "bg-primary hover:bg-primary/90 hover:scale-105 active:scale-95 cursor-pointer"
                : "bg-muted cursor-not-allowed opacity-50"
            )}
          >
            <Mic className="h-10 w-10 text-primary-foreground" />
          </button>
          <div className="text-center">
            <p className="text-sm font-medium">
              {hasValidSession ? 'Click to start recording' : 'Preparing recorder...'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Maximum: {formatDuration(maxDurationMs)}
              {minDurationMs > 0 && ` • Minimum: ${formatDuration(minDurationMs)}`}
            </p>
          </div>
        </div>
      )
    }

    // Requesting permission
    if (state === 'requesting') {
      return (
        <div className="flex flex-col items-center gap-4 py-6">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
            <Loader2 className="h-10 w-10 text-muted-foreground animate-spin" />
          </div>
          <p className="text-sm text-muted-foreground">Requesting microphone access...</p>
        </div>
      )
    }

    // Recording state
    if (state === 'recording' || state === 'paused') {
      return (
        <div className="flex flex-col items-center gap-4 py-4">
          {/* Waveform visualization */}
          <RecordingWaveform isRecording={state === 'recording'} />

          {/* Duration and progress */}
          <div className="w-full max-w-xs space-y-2">
            <div className="flex justify-between text-sm">
              <StateIndicator state={state} />
              <span className="font-mono">{formatDurationWithMax(durationMs, maxDurationMs)}</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>

          {/* Live transcript */}
          {liveTranscription.recentTranscript && (
            <div className="w-full max-w-md p-4 bg-muted/30 rounded-lg border border-dashed">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                <p className="text-xs font-medium text-muted-foreground">
                  {liveTranscription.isSpeaking ? 'Listening...' : 'Live transcript'}
                </p>
              </div>
              <p className="text-sm text-foreground leading-relaxed">
                {liveTranscription.fullTranscript || liveTranscription.recentTranscript}
              </p>
              {liveTranscription.wordCount > 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  {liveTranscription.wordCount} words
                </p>
              )}
            </div>
          )}

          {/* Control buttons */}
          <div className="flex items-center gap-3">
            {/* Pause/Resume button */}
            {state === 'recording' ? (
              <Button
                variant="outline"
                size="icon"
                onClick={pauseRecording}
                className="h-12 w-12 rounded-full"
              >
                <Pause className="h-5 w-5" />
              </Button>
            ) : (
              <Button
                variant="outline"
                size="icon"
                onClick={resumeRecording}
                className="h-12 w-12 rounded-full"
              >
                <Play className="h-5 w-5" />
              </Button>
            )}

            {/* Stop button */}
            <Button
              variant="default"
              size="icon"
              onClick={stopRecording}
              disabled={!canStop}
              className="h-14 w-14 rounded-full bg-red-500 hover:bg-red-600"
            >
              <Square className="h-6 w-6" />
            </Button>
          </div>

          {!canStop && minDurationMs > 0 && (
            <p className="text-xs text-muted-foreground">
              Record at least {formatDuration(minDurationMs)} to stop
            </p>
          )}
        </div>
      )
    }

    // Error state
    if (state === 'error') {
      return (
        <div className="flex flex-col items-center gap-4 py-6">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-destructive">Recording failed</p>
            <p className="text-xs text-muted-foreground mt-1">{error}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={resetRecording}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Try again
          </Button>
        </div>
      )
    }

    // Review state (after stopping, before confirming)
    if (state === 'review') {
      return (
        <div className="flex flex-col items-center gap-4 py-6">
          <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
            <Check className="h-8 w-8 text-green-500" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium">Recording complete</p>
            <p className="text-xs text-muted-foreground mt-1">
              Duration: {formatDuration(durationMs)}
            </p>
          </div>

          {/* Show transcript if available */}
          {liveTranscription.fullTranscript && (
            <div className="w-full max-w-md p-4 bg-muted/50 rounded-lg border">
              <p className="text-xs font-medium text-muted-foreground mb-2">Transcript:</p>
              <p className="text-sm text-foreground leading-relaxed">
                {liveTranscription.fullTranscript}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                {liveTranscription.wordCount} words
              </p>
            </div>
          )}

          <div className="flex items-center gap-3">
            {/* Playback button */}
            {recordingId && !isPreviewMode && (
              <Button
                variant={isPlaying ? 'default' : 'outline'}
                size="sm"
                onClick={isPlaying ? stopPlayback : handlePlayback}
                className="gap-2"
              >
                <Volume2 className="h-4 w-4" />
                {isPlaying ? 'Stop' : 'Play'}
              </Button>
            )}

            {/* Re-record button */}
            {allowRerecord && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRerecord}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Re-record
              </Button>
            )}
          </div>
        </div>
      )
    }

    // Uploading state
    if (state === 'uploading') {
      return (
        <div className="flex flex-col items-center gap-4 py-6">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
            <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
          </div>
          <p className="text-sm text-muted-foreground">Saving recording...</p>
        </div>
      )
    }

    return null
  }

  return (
    <div className="rounded-lg border bg-card p-4">
      {renderContent()}
    </div>
  )
}
