'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

export interface TranscriptSegment {
  /** Start time in milliseconds (relative to recording start) */
  start: number
  /** End time in milliseconds */
  end: number
  /** Transcript text for this segment */
  text: string
  /** Speaker label if available */
  speaker?: string
  /** Confidence score 0-1 */
  confidence?: number
}

export interface UseLiveTranscriptionOptions {
  /** MediaStream containing audio track to transcribe */
  mediaStream: MediaStream | null
  /** Whether transcription is enabled */
  enabled: boolean
  /** Study ID for API key retrieval */
  studyId: string
  /** Participant ID for API key retrieval and saving transcript */
  participantId: string
  /** Session token for authentication */
  sessionToken: string
  /** Recording ID for saving transcript (optional - provide when recording starts) */
  recordingId?: string
  /** Silence duration threshold in seconds. Default: 15 */
  silenceThresholdSeconds?: number
  /** Callback when silence is detected (no transcription for threshold duration) */
  onSilenceDetected?: () => void
  /** Callback when speech resumes */
  onSpeechResumed?: () => void
  /** Callback when transcript is received */
  onTranscript?: (text: string, isFinal: boolean) => void
}

export interface UseLiveTranscriptionReturn {
  /** Whether the WebSocket connection is active */
  isConnected: boolean
  /** Whether speech is currently being detected */
  isSpeaking: boolean
  /** Whether silence has been detected (no transcription for threshold duration) */
  isSilent: boolean
  /** Current silence duration in seconds */
  silenceDuration: number
  /** Recent transcript text (last utterance) */
  recentTranscript: string
  /** All accumulated transcript segments */
  accumulatedSegments: TranscriptSegment[]
  /** Full accumulated transcript text */
  fullTranscript: string
  /** Total word count */
  wordCount: number
  /** Connection error if any */
  error: string | null
  /** Reset silence detection */
  resetSilence: () => void
  /** Save accumulated transcript to database. Call when recording stops. */
  saveTranscript: (recordingId: string) => Promise<{ transcriptId: string; status: string } | null>
  /** Clear accumulated segments (for new recording) */
  clearSegments: () => void
}

interface DeepgramTranscriptMessage {
  type: 'Results'
  channel_index: [number, number]
  duration: number
  start: number
  is_final: boolean
  speech_final: boolean
  channel: {
    alternatives: Array<{
      transcript: string
      confidence: number
      words: Array<{
        word: string
        start: number
        end: number
        confidence: number
      }>
    }>
  }
}

interface DeepgramMetadataMessage {
  type: 'Metadata'
  request_id: string
  model_info: {
    name: string
    version: string
  }
}

type DeepgramMessage = DeepgramTranscriptMessage | DeepgramMetadataMessage | { type: string }

/** Live speech transcription via Deepgram WebSocket with segment accumulation and saving. */
export function useLiveTranscription(
  options: UseLiveTranscriptionOptions
): UseLiveTranscriptionReturn {
  const {
    mediaStream,
    enabled,
    studyId,
    participantId,
    sessionToken,
    silenceThresholdSeconds = 15,
    onSilenceDetected,
    onSpeechResumed,
    onTranscript,
  } = options

  const [isConnected, setIsConnected] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isSilent, setIsSilent] = useState(false)
  const [silenceDuration, setSilenceDuration] = useState(0)
  const [recentTranscript, setRecentTranscript] = useState('')
  const [accumulatedSegments, setAccumulatedSegments] = useState<TranscriptSegment[]>([])
  const [error, setError] = useState<string | null>(null)
  const [reconnectTrigger, setReconnectTrigger] = useState(0)

  const wsRef = useRef<WebSocket | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const apiKeyRef = useRef<string | null>(null)
  const silenceStartTimeRef = useRef<number | null>(null)
  const silenceIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const hadSilenceEventRef = useRef(false)
  const lastTranscriptTimeRef = useRef<number>(Date.now())
  const mountedRef = useRef(true)
  const recordingStartTimeRef = useRef<number>(Date.now())
  const sessionTokenRef = useRef(sessionToken)
  const participantIdRef = useRef(participantId)
  // Ref mirror of accumulatedSegments — always has latest value, avoids stale closure issues
  const accumulatedSegmentsRef = useRef<TranscriptSegment[]>([])

  useEffect(() => {
    sessionTokenRef.current = sessionToken
    participantIdRef.current = participantId
  }, [sessionToken, participantId])

  const onSilenceDetectedRef = useRef(onSilenceDetected)
  const onSpeechResumedRef = useRef(onSpeechResumed)
  const onTranscriptRef = useRef(onTranscript)

  useEffect(() => {
    onSilenceDetectedRef.current = onSilenceDetected
    onSpeechResumedRef.current = onSpeechResumed
    onTranscriptRef.current = onTranscript
  }, [onSilenceDetected, onSpeechResumed, onTranscript])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const fullTranscript = accumulatedSegments.map(s => s.text).join(' ').trim()
  const wordCount = fullTranscript.split(/\s+/).filter(w => w.length > 0).length

  const resetSilence = useCallback(() => {
    setIsSilent(false)
    setSilenceDuration(0)
    silenceStartTimeRef.current = null
    hadSilenceEventRef.current = false
  }, [])

  const clearSegments = useCallback(() => {
    setAccumulatedSegments([])
    accumulatedSegmentsRef.current = []
  }, [])

  const saveTranscript = useCallback(async (recordingId: string): Promise<{ transcriptId: string; status: string } | null> => {
    const isPreviewMode = sessionTokenRef.current === 'preview-token' || participantIdRef.current === 'preview-participant'
    if (isPreviewMode) {
      return { transcriptId: 'preview-transcript', status: 'skipped' }
    }

    // Flush: stop MediaRecorder so final audio chunk is sent, then signal Deepgram to
    // finish processing via CloseStream, and wait for any remaining final results.
    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
      }
    } catch {
      // MediaRecorder may already be stopped
    }

    // Send CloseStream to Deepgram — tells it to flush remaining audio and send final results
    const ws = wsRef.current
    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify({ type: 'CloseStream' }))
      } catch {
        // WS may have already closed
      }

      // Wait for Deepgram to send back final results before we read segments.
      // Deepgram typically responds within 500ms after CloseStream.
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(resolve, 1500)
        const origOnClose = ws.onclose
        ws.onclose = (event) => {
          clearTimeout(timeout)
          if (origOnClose) origOnClose.call(ws, event)
          resolve()
        }
      })
    }

    // Read from ref (always has latest segments) instead of state closure
    const segments = accumulatedSegmentsRef.current
    const fullText = segments.map(s => s.text).join(' ').trim()
    const wc = fullText.split(/\s+/).filter(w => w.length > 0).length

    try {
      const response = await fetch('/api/recordings/save-live-transcript', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-token': sessionTokenRef.current,
        },
        body: JSON.stringify({
          recording_id: recordingId,
          participant_id: participantIdRef.current,
          segments,
          language: 'multi',
          word_count: wc,
        }),
      })

      if (!response.ok) {
        return null
      }
      const result = await response.json()
      return result
    } catch {
      return null
    }
  }, [])

  const fetchApiKey = useCallback(async () => {
    const isPreviewMode = sessionTokenRef.current === 'preview-token' || participantIdRef.current === 'preview-participant'
    if (isPreviewMode) return 'preview-mode-no-api-key'

    // Retry up to 3 times with exponential backoff
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await fetch('/api/recordings/transcription-key', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-session-token': sessionTokenRef.current,
          },
          body: JSON.stringify({
            study_id: studyId,
            participant_id: participantIdRef.current,
          }),
        })

        if (!response.ok) {
          const data = await response.json()
          const errorMessage = data.error || 'Failed to get transcription key'
          if (errorMessage.includes('not enabled')) return null
          throw new Error(errorMessage)
        }

        const data = await response.json()
        return data.api_key as string
      } catch (_err) {
        if (attempt < 2) {
          await new Promise(r => setTimeout(r, 200 * Math.pow(2, attempt)))
          continue
        }
        return null
      }
    }
    return null
  }, [studyId])

  const keepAliveRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const connectWebSocket = useCallback((apiKey: string) => {
    const params = new URLSearchParams({
      model: 'nova-3',
      language: 'multi',
      punctuate: 'true',
      interim_results: 'true',
      utterance_end_ms: '1000',
      vad_events: 'true',
      diarize: 'false',
      smart_format: 'true',
    })

    const wsUrl = `wss://api.deepgram.com/v1/listen?${params.toString()}`

    const ws = new WebSocket(wsUrl, ['token', apiKey])

    ws.onopen = () => {
      if (mountedRef.current) {
        setIsConnected(true)
        setError(null)
        recordingStartTimeRef.current = Date.now()
        silenceStartTimeRef.current = Date.now()
        lastTranscriptTimeRef.current = Date.now()
      }

      // Send KeepAlive every 8s to prevent Deepgram net0001 timeout
      if (keepAliveRef.current) clearInterval(keepAliveRef.current)
      keepAliveRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          try { ws.send(JSON.stringify({ type: 'KeepAlive' })) } catch { /* ws closing */ }
        }
      }, 8000)
    }

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as DeepgramMessage

        if (message.type === 'Results') {
          const dgMessage = message as DeepgramTranscriptMessage
          const transcript = dgMessage.channel.alternatives[0]?.transcript || ''
          const confidence = dgMessage.channel.alternatives[0]?.confidence || 0
          const isFinal = dgMessage.is_final

          if (transcript.trim()) {
            lastTranscriptTimeRef.current = Date.now()

            if (mountedRef.current) {
              setIsSpeaking(true)
              setRecentTranscript(transcript)

              if (isFinal) {
                const startMs = Math.round(dgMessage.start * 1000)
                const endMs = Math.round((dgMessage.start + dgMessage.duration) * 1000)

                const segment: TranscriptSegment = {
                  start: startMs,
                  end: endMs,
                  text: transcript,
                  confidence,
                }

                setAccumulatedSegments(prev => {
                  const next = [...prev, segment]
                  accumulatedSegmentsRef.current = next
                  return next
                })
              }

              if (silenceStartTimeRef.current !== null) {
                if (hadSilenceEventRef.current) {
                  onSpeechResumedRef.current?.()
                }
                silenceStartTimeRef.current = null
                hadSilenceEventRef.current = false
                setIsSilent(false)
                setSilenceDuration(0)
              }

              onTranscriptRef.current?.(transcript, isFinal)
            }
          } else if (isFinal) {
            if (mountedRef.current) {
              setIsSpeaking(false)
              if (silenceStartTimeRef.current === null) {
                silenceStartTimeRef.current = Date.now()
              }
            }
          }
        }
      } catch {
        // Failed to parse message
      }
    }

    ws.onerror = () => {
      if (mountedRef.current) {
        setError('Connection error')
        setIsConnected(false)
      }
    }

    ws.onclose = (event) => {
      // Clear keepalive interval
      if (keepAliveRef.current) {
        clearInterval(keepAliveRef.current)
        keepAliveRef.current = null
      }

      if (mountedRef.current) {
        // If connection closed unexpectedly and there's accumulated transcript,
        // fire silence callback so the transcript gets sent before we lose it
        if (event.code !== 1000 && accumulatedSegmentsRef.current.length > 0) {
          onSilenceDetectedRef.current?.()
        }

        setIsConnected(false)
        if (event.code !== 1000) {
          setError(`Connection closed: ${event.reason || 'Unknown reason'}`)
          // Auto-reconnect after 2s if still enabled
          setTimeout(() => {
            if (mountedRef.current) {
              setReconnectTrigger(prev => prev + 1)
            }
          }, 2000)
        }
      }
    }

    return ws
  }, [])

  const startMediaRecorder = useCallback((stream: MediaStream, ws: WebSocket) => {
    const audioTracks = stream.getAudioTracks()
    if (audioTracks.length === 0) {
      setError('No audio tracks available')
      return null
    }

    const audioStream = new MediaStream(audioTracks)

    let mimeType = 'audio/webm'
    if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
      mimeType = 'audio/webm;codecs=opus'
    } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
      mimeType = 'audio/ogg;codecs=opus'
    } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
      mimeType = 'audio/mp4'
    }

    try {
      const recorder = new MediaRecorder(audioStream, {
        mimeType,
        audioBitsPerSecond: 64000, // Lower bitrate for speech
      })

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0 && ws.readyState === WebSocket.OPEN) {
          ws.send(event.data)
        }
      }

      recorder.onerror = () => {
        setError('Recording error')
      }

      recorder.start(250)
      return recorder
    } catch {
      setError('Failed to start audio recording')
      return null
    }
  }, [])

  useEffect(() => {
    if (!enabled || !isConnected) {
      if (silenceIntervalRef.current) {
        clearInterval(silenceIntervalRef.current)
        silenceIntervalRef.current = null
      }
      return
    }

    silenceIntervalRef.current = setInterval(() => {
      if (silenceStartTimeRef.current !== null) {
        const currentSilenceDuration = (Date.now() - silenceStartTimeRef.current) / 1000
        setSilenceDuration(currentSilenceDuration)

        if (currentSilenceDuration >= silenceThresholdSeconds && !hadSilenceEventRef.current) {
          setIsSilent(true)
          hadSilenceEventRef.current = true
          onSilenceDetectedRef.current?.()
        }
      }
    }, 500)

    return () => {
      if (silenceIntervalRef.current) {
        clearInterval(silenceIntervalRef.current)
        silenceIntervalRef.current = null
      }
    }
  }, [enabled, isConnected, silenceThresholdSeconds])

  useEffect(() => {
    const isPreviewMode = sessionTokenRef.current === 'preview-token' || participantIdRef.current === 'preview-participant'

    if (isPreviewMode) {
      if (enabled && mediaStream) {
        setIsConnected(true)

        const mockTimeout = setTimeout(() => {
          setIsSpeaking(true)
          setRecentTranscript('This is a preview mode demo transcript.')

          const mockSegment: TranscriptSegment = {
            start: 0,
            end: 3000,
            text: 'This is a preview mode demo transcript showing how live transcription works.',
            confidence: 0.95,
          }
          setAccumulatedSegments([mockSegment])
          accumulatedSegmentsRef.current = [mockSegment]

          setTimeout(() => {
            setIsSpeaking(false)
          }, 500)
        }, 2000)

        return () => clearTimeout(mockTimeout)
      }
      return
    }

    if (!enabled || !mediaStream) {
      if (keepAliveRef.current) {
        clearInterval(keepAliveRef.current)
        keepAliveRef.current = null
      }
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop()
        mediaRecorderRef.current = null
      }
      if (wsRef.current) {
        wsRef.current.close(1000, 'Disabled')
        wsRef.current = null
      }

      setIsConnected(false)
      setIsSpeaking(false)
      setIsSilent(false)
      setSilenceDuration(0)
      setRecentTranscript('')
      silenceStartTimeRef.current = null
      hadSilenceEventRef.current = false
      return
    }

    let mounted = true

    const setup = async () => {
      try {
        // Clean up any existing connection before reconnecting
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          try { mediaRecorderRef.current.stop() } catch { /* already stopped */ }
          mediaRecorderRef.current = null
        }
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.close(1000, 'Reconnecting')
          wsRef.current = null
        }

        if (!apiKeyRef.current) {
          apiKeyRef.current = await fetchApiKey()
          if (!apiKeyRef.current) {
            return
          }
        }

        if (!mounted) return

        setError(null)
        const ws = connectWebSocket(apiKeyRef.current)
        wsRef.current = ws

        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Connection timeout')), 10000)

          const originalOnOpen = ws.onopen
          const originalOnError = ws.onerror

          ws.onopen = (event) => {
            clearTimeout(timeout)
            if (originalOnOpen) originalOnOpen.call(ws, event)
            resolve()
          }
          ws.onerror = (event) => {
            clearTimeout(timeout)
            if (originalOnError) originalOnError.call(ws, event as Event)
            reject(new Error('Connection failed'))
          }
        })

        if (!mounted) {
          ws.close(1000, 'Unmounted')
          return
        }

        const recorder = startMediaRecorder(mediaStream, ws)
        if (recorder) {
          mediaRecorderRef.current = recorder
        } else {
          setError('Failed to start audio capture')
        }
      } catch (err) {
        if (mounted) {
          const msg = err instanceof Error ? err.message : 'Setup failed'
          setError(msg)
        }
      }
    }

    setup()

    return () => {
      mounted = false
      // Note: Do NOT close MediaRecorder or WebSocket here — saveTranscript handles
      // the graceful shutdown (stop recorder → CloseStream → wait for final results → save).
      // Only force-close if the WS is still open after a delay (e.g., component unmount
      // without saveTranscript being called).
      const recorder = mediaRecorderRef.current
      const ws = wsRef.current
      setTimeout(() => {
        if (recorder && recorder.state !== 'inactive') {
          try { recorder.stop() } catch { /* already stopped */ }
        }
        mediaRecorderRef.current = null
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.close(1000, 'Cleanup')
        }
        wsRef.current = null
      }, 3000) // Give saveTranscript 3s to complete before force-cleanup
    }
  }, [enabled, mediaStream, fetchApiKey, connectWebSocket, startMediaRecorder, reconnectTrigger])

  return {
    isConnected,
    isSpeaking,
    isSilent,
    silenceDuration,
    recentTranscript,
    accumulatedSegments,
    fullTranscript,
    wordCount,
    error,
    resetSilence,
    saveTranscript,
    clearSegments,
  }
}
