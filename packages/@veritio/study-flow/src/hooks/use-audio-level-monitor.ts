'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

export interface UseAudioLevelMonitorOptions {
  mediaStream: MediaStream | null
  enabled: boolean
  audioLevelThreshold?: number
  silenceThresholdSeconds?: number
  updateIntervalMs?: number
  onSilenceDetected?: () => void
  onSpeechResumed?: () => void
}

export interface UseAudioLevelMonitorReturn {
  audioLevel: number
  isSpeaking: boolean
  isSilent: boolean
  silenceDuration: number
  resetSilence: () => void
}

function calculateRMS(dataArray: Uint8Array): number {
  let sum = 0
  for (let i = 0; i < dataArray.length; i++) {
    const normalized = (dataArray[i] - 128) / 128
    sum += normalized * normalized
  }
  return Math.sqrt(sum / dataArray.length)
}

export function useAudioLevelMonitor(
  options: UseAudioLevelMonitorOptions
): UseAudioLevelMonitorReturn {
  const {
    mediaStream,
    enabled,
    audioLevelThreshold = 0.05,
    silenceThresholdSeconds = 15,
    updateIntervalMs = 100,
    onSilenceDetected,
    onSpeechResumed,
  } = options

  const [audioLevel, setAudioLevel] = useState(0)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isSilent, setIsSilent] = useState(false)
  const [silenceDuration, setSilenceDuration] = useState(0)

  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const dataArrayRef = useRef<Uint8Array<ArrayBuffer> | null>(null)

  const animationFrameRef = useRef<number | null>(null)
  const lastUpdateTimeRef = useRef<number>(0)
  const silenceStartTimeRef = useRef<number | null>(null)
  const hadSilenceEventRef = useRef(false)

  const onSilenceDetectedRef = useRef(onSilenceDetected)
  const onSpeechResumedRef = useRef(onSpeechResumed)

  useEffect(() => {
    onSilenceDetectedRef.current = onSilenceDetected
    onSpeechResumedRef.current = onSpeechResumed
  }, [onSilenceDetected, onSpeechResumed])

  const resetSilence = useCallback(() => {
    setIsSilent(false)
    setSilenceDuration(0)
    silenceStartTimeRef.current = null
    hadSilenceEventRef.current = false
  }, [])

  useEffect(() => {
    if (!enabled || !mediaStream) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {})
        audioContextRef.current = null
      }
      analyserRef.current = null
      sourceRef.current = null
      dataArrayRef.current = null

      setAudioLevel(0)
      setIsSpeaking(false)
      setIsSilent(false)
      setSilenceDuration(0)
      silenceStartTimeRef.current = null
      hadSilenceEventRef.current = false
      return
    }

    const audioTracks = mediaStream.getAudioTracks()
    if (audioTracks.length === 0) {
      // No audio tracks in MediaStream
      return
    }

    let audioContext: AudioContext
    try {
      audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    } catch (_error) {
      // Web Audio API not supported
      return
    }

    if (audioContext.state === 'suspended') {
      audioContext.resume().catch(() => {})
    }

    const analyser = audioContext.createAnalyser()
    analyser.fftSize = 256
    analyser.smoothingTimeConstant = 0.8

    const source = audioContext.createMediaStreamSource(mediaStream)
    source.connect(analyser)
    audioContextRef.current = audioContext
    analyserRef.current = analyser
    sourceRef.current = source
    dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount) as Uint8Array<ArrayBuffer>

    const analyze = () => {
      if (!analyserRef.current || !dataArrayRef.current) return

      const now = performance.now()

      if (now - lastUpdateTimeRef.current >= updateIntervalMs) {
        analyserRef.current.getByteFrequencyData(dataArrayRef.current)
        const rms = calculateRMS(dataArrayRef.current)
        const displayLevel = Math.min(100, Math.round(rms * 500))
        setAudioLevel(displayLevel)

        const speaking = rms > audioLevelThreshold
        setIsSpeaking(speaking)

        if (speaking) {
          if (silenceStartTimeRef.current !== null) {
            if (hadSilenceEventRef.current) {
              onSpeechResumedRef.current?.()
            }
            silenceStartTimeRef.current = null
            hadSilenceEventRef.current = false
            setIsSilent(false)
            setSilenceDuration(0)
          }
        } else {
          if (silenceStartTimeRef.current === null) {
            silenceStartTimeRef.current = now
          }

          const currentSilenceDuration = (now - silenceStartTimeRef.current) / 1000
          setSilenceDuration(currentSilenceDuration)

          if (currentSilenceDuration >= silenceThresholdSeconds && !hadSilenceEventRef.current) {
            setIsSilent(true)
            hadSilenceEventRef.current = true
            onSilenceDetectedRef.current?.()
          }
        }

        lastUpdateTimeRef.current = now
      }

      animationFrameRef.current = requestAnimationFrame(analyze)
    }

    animationFrameRef.current = requestAnimationFrame(analyze)

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }

      if (sourceRef.current) {
        sourceRef.current.disconnect()
        sourceRef.current = null
      }

      if (analyserRef.current) {
        analyserRef.current.disconnect()
        analyserRef.current = null
      }

      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {})
        audioContextRef.current = null
      }

      dataArrayRef.current = null
    }
  }, [enabled, mediaStream, audioLevelThreshold, silenceThresholdSeconds, updateIntervalMs])

  return {
    audioLevel,
    isSpeaking,
    isSilent,
    silenceDuration,
    resetSilence,
  }
}
