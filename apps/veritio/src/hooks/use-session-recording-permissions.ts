'use client'

import { useCallback } from 'react'
import { toast } from '@/components/ui/sonner'
import { useRecordingStore } from '@/stores/recording-store'
import type { RecordingCaptureMode } from '@/components/builders/shared/types'

interface UseSessionRecordingPermissionsOptions {
  preferFullScreen?: boolean
}

export function useSessionRecordingPermissions(options: UseSessionRecordingPermissionsOptions) {
  const { preferFullScreen } = options

  const { setPermissionStatus } = useRecordingStore()

  const buildFromPreAcquired = useCallback((
    preAcquired: MediaStream[],
    mode: RecordingCaptureMode
  ): { primary: MediaStream; webcam?: MediaStream } => {
    const primaryStream = new MediaStream()
    let webcamStream: MediaStream | undefined

    const audioTracks: MediaStreamTrack[] = []
    const videoTracks: MediaStreamTrack[] = []
    for (const stream of preAcquired) {
      audioTracks.push(...stream.getAudioTracks())
      videoTracks.push(...stream.getVideoTracks())
    }

    const includesMic = mode === 'audio' || mode === 'screen_and_audio' || mode === 'video_and_audio'
    if (includesMic && audioTracks.length > 0) {
      primaryStream.addTrack(audioTracks[0])
      setPermissionStatus('microphone', 'granted')
    }

    if (mode === 'video_and_audio' || mode === 'video_only') {
      const screenTrack = videoTracks.find(t => t.getSettings().displaySurface)
      const webcamTrack = videoTracks.find(t => !t.getSettings().displaySurface)
      if (screenTrack) {
        primaryStream.addTrack(screenTrack)
        setPermissionStatus('screen', 'granted')
      }
      if (webcamTrack) {
        webcamStream = new MediaStream([webcamTrack])
        setPermissionStatus('camera', 'granted')
      }
    } else if (mode === 'screen_and_audio' || mode === 'screen_only') {
      if (videoTracks.length > 0) {
        primaryStream.addTrack(videoTracks[0])
        setPermissionStatus('screen', 'granted')
      }
    }

    return { primary: primaryStream, webcam: webcamStream }
  }, [setPermissionStatus])

  const requestPermissions = useCallback(async (
    mode: RecordingCaptureMode,
    preAcquiredStreams?: MediaStream[]
  ): Promise<{ primary: MediaStream; webcam?: MediaStream }> => {
    if (preAcquiredStreams && preAcquiredStreams.length > 0) {
      return buildFromPreAcquired(preAcquiredStreams, mode)
    }

    let audioStream: MediaStream | null = null
    let videoStream: MediaStream | null = null
    let screenStream: MediaStream | null = null

    try {
      if (mode === 'audio' || mode === 'screen_and_audio' || mode === 'video_and_audio') {
        setPermissionStatus('microphone', 'pending')
        audioStream = await navigator.mediaDevices.getUserMedia({ audio: true })
        setPermissionStatus('microphone', 'granted')
      }

      if (mode === 'screen_and_audio' || mode === 'video_and_audio' || mode === 'screen_only' || mode === 'video_only') {
        setPermissionStatus('screen', 'pending')
        const displayMediaOptions = preferFullScreen
          ? {
              video: { displaySurface: 'monitor' }, // Pre-select "Entire Screen" in Chrome picker
              audio: false,
              preferCurrentTab: false,
              selfBrowserSurface: 'exclude', // Hide study tab from picker
              surfaceSwitching: 'exclude',    // Hide "Share this tab instead" button during recording
              monitorTypeSurfaces: 'include', // Ensure monitor surfaces are shown
            }
          : {
              video: true,
              audio: false,
              preferCurrentTab: true, // Capture current tab only (better privacy)
              selfBrowserSurface: 'include', // Include this tab in picker
            }
          const maxAttempts = preferFullScreen ? 3 : 1
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          screenStream = await navigator.mediaDevices.getDisplayMedia(
            displayMediaOptions as DisplayMediaStreamOptions
          )

          if (preferFullScreen) {
            const surfaceType = screenStream.getVideoTracks()[0]?.getSettings()?.displaySurface
            if (surfaceType && surfaceType !== 'monitor') {
              screenStream.getTracks().forEach(track => track.stop())
              screenStream = null
              if (attempt < maxAttempts) {
                toast.error('Please select "Entire Screen" to record your activity across tabs.', { duration: 4000 })
                // Small delay so the toast is visible before the picker re-opens
                await new Promise(r => setTimeout(r, 1500))
                continue
              }
              throw new Error('Please select "Entire Screen" instead of a window or tab, so we can record your activity across tabs.')
            }
          }
          break // Valid selection
        }

        setPermissionStatus('screen', 'granted')
      }

      if (mode === 'video_and_audio' || mode === 'video_only') {
        setPermissionStatus('camera', 'pending')
        videoStream = await navigator.mediaDevices.getUserMedia({ video: true })
        setPermissionStatus('camera', 'granted')
      }

      const primaryStream = new MediaStream()

      if (audioStream) {
        audioStream.getAudioTracks().forEach(track => primaryStream.addTrack(track))
      }

      if (screenStream) {
        screenStream.getVideoTracks().forEach(track => primaryStream.addTrack(track))
      } else if (videoStream && mode !== 'video_and_audio' && mode !== 'video_only') {
        videoStream.getVideoTracks().forEach(track => primaryStream.addTrack(track))
      }

      const webcamStream = ((mode === 'video_and_audio' || mode === 'video_only') && videoStream)
        ? videoStream
        : undefined

      return { primary: primaryStream, webcam: webcamStream }
    } catch (err) {
      audioStream?.getTracks().forEach(track => track.stop())
      videoStream?.getTracks().forEach(track => track.stop())
      screenStream?.getTracks().forEach(track => track.stop())

      if (err instanceof Error && err.name === 'NotAllowedError') {
        setPermissionStatus('microphone', 'denied')
        setPermissionStatus('camera', 'denied')
        setPermissionStatus('screen', 'denied')
      }

      throw err
    }
  }, [setPermissionStatus, preferFullScreen, buildFromPreAcquired])

  return { requestPermissions }
}
