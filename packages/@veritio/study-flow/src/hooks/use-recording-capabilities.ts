'use client'

import { useState, useEffect, useCallback } from 'react'
import type { RecordingCaptureMode } from '../types/player-types'

export interface RecordingCapabilities {
  hasMediaRecorder: boolean
  hasScreenCapture: boolean
  hasUserMedia: boolean
  hasWebcam: boolean
  hasMicrophone: boolean
  isMobile: boolean
  supportedMimeTypes: string[]
  preferredMimeType: string | null
}

export interface RecordingCapabilityCheck {
  capabilities: RecordingCapabilities
  isLoading: boolean
  error: Error | null
  canCapture: (mode: RecordingCaptureMode) => boolean
  getFallbackMode: (requestedMode: RecordingCaptureMode) => RecordingCaptureMode | null
}

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
          } catch (_err) {
            // Could not enumerate devices — assume available
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

  const canCapture = useCallback((mode: RecordingCaptureMode): boolean => {
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
  }, [capabilities])

  const getFallbackMode = useCallback((requestedMode: RecordingCaptureMode): RecordingCaptureMode | null => {
    if (canCapture(requestedMode)) return requestedMode

    switch (requestedMode) {
      case 'video_and_audio':
        if (canCapture('screen_and_audio')) return 'screen_and_audio'
        if (canCapture('audio')) return 'audio'
        return null
      case 'screen_and_audio':
        if (canCapture('audio')) return 'audio'
        return null
      case 'audio':
        return null
      default:
        return null
    }
  }, [canCapture])

  return {
    capabilities,
    isLoading,
    error,
    canCapture,
    getFallbackMode,
  }
}
