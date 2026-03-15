'use client'

import { useState, useEffect } from 'react'
import type { RecordingCaptureMode } from '@/components/builders/shared/types'

export interface RecordingCapabilities {
  /** Whether MediaRecorder API is supported */
  hasMediaRecorder: boolean
  /** Whether screen capture is supported (getDisplayMedia) - desktop only */
  hasScreenCapture: boolean
  /** Whether audio/video input is supported (getUserMedia) */
  hasUserMedia: boolean
  /** Whether webcam is available */
  hasWebcam: boolean
  /** Whether microphone is available */
  hasMicrophone: boolean
  /** Device type detection */
  isMobile: boolean
  /** Supported MIME types for recording */
  supportedMimeTypes: string[]
  /** Best available MIME type for recording */
  preferredMimeType: string | null
}

export interface RecordingCapabilityCheck {
  /** Current browser capabilities */
  capabilities: RecordingCapabilities
  /** Whether capabilities have been detected */
  isLoading: boolean
  /** Error during capability detection */
  error: Error | null
  /** Check if a specific capture mode is supported */
  canCapture: (mode: RecordingCaptureMode) => boolean
  /** Get the fallback mode for the requested mode */
  getFallbackMode: (requestedMode: RecordingCaptureMode) => RecordingCaptureMode | null
}

/** Detects browser recording capabilities (MediaRecorder, screen capture, devices). */
export function useRecordingCapabilities(): RecordingCapabilityCheck {
  const [capabilities, setCapabilities] = useState<RecordingCapabilities>({
    hasMediaRecorder: false,
    hasScreenCapture: false,
    hasUserMedia: false,
    hasWebcam: false,
    hasMicrophone: false,
    isMobile: false,
    supportedMimeTypes: [],
    preferredMimeType: null,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    async function detectCapabilities() {
      try {
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
        const hasMediaRecorder = typeof MediaRecorder !== 'undefined'
        const hasUserMedia = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
        const hasScreenCapture = !isMobile && !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia)
        let hasWebcam = false
        let hasMicrophone = false
        if (hasUserMedia) {
          try {
            const devices = await navigator.mediaDevices.enumerateDevices()
            hasWebcam = devices.some(device => device.kind === 'videoinput')
            hasMicrophone = devices.some(device => device.kind === 'audioinput')
          } catch {
            hasWebcam = true
            hasMicrophone = true
          }
        }

        const mimeTypesToCheck = [
          'video/webm;codecs=vp9,opus',
          'video/webm;codecs=vp8,opus',
          'video/webm;codecs=h264,opus',
          'video/webm',
          'audio/webm;codecs=opus',
          'audio/webm',
        ]

        const supportedMimeTypes = hasMediaRecorder
          ? mimeTypesToCheck.filter(type => MediaRecorder.isTypeSupported(type))
          : []

        const preferredMimeType = supportedMimeTypes[0] || null

        setCapabilities({
          hasMediaRecorder,
          hasScreenCapture,
          hasUserMedia,
          hasWebcam,
          hasMicrophone,
          isMobile,
          supportedMimeTypes,
          preferredMimeType,
        })
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to detect recording capabilities'))
      } finally {
        setIsLoading(false)
      }
    }

    detectCapabilities()
  }, [])

  const canCapture = (mode: RecordingCaptureMode): boolean => {
    if (!capabilities.hasMediaRecorder || !capabilities.hasUserMedia) {
      return false
    }

    switch (mode) {
      case 'audio':
        return capabilities.hasMicrophone
      case 'screen_and_audio':
        return capabilities.hasScreenCapture && capabilities.hasMicrophone && !capabilities.isMobile
      case 'video_and_audio':
        return capabilities.hasScreenCapture && capabilities.hasMicrophone && capabilities.hasWebcam && !capabilities.isMobile
      default:
        return false
    }
  }

  const getFallbackMode = (requestedMode: RecordingCaptureMode): RecordingCaptureMode | null => {
    if (canCapture(requestedMode)) {
      return requestedMode
    }

    // Fallback chain: video_and_audio -> screen_and_audio -> audio -> null
    switch (requestedMode) {
      case 'video_and_audio':
        if (canCapture('screen_and_audio')) return 'screen_and_audio'
        if (canCapture('audio')) return 'audio'
        return null
      case 'screen_and_audio':
        if (canCapture('audio')) return 'audio'
        return null
      case 'audio':
        return null // No fallback for audio-only
      default:
        return null
    }
  }

  return {
    capabilities,
    isLoading,
    error,
    canCapture,
    getFallbackMode,
  }
}
