'use client'

import { useState, useCallback } from 'react'
import { getAuthFetchInstance } from '@/lib/swr/fetcher'
import type { ExportConfig } from '@/components/analysis/recordings/video-editor/export-dialog'

export interface ExportResult {
  downloadUrl: string
  fileName: string
  fileSize: number
  durationMs: number
}

export type ExportStatus = 'idle' | 'preparing' | 'processing' | 'complete' | 'error'

export function useVideoExport(studyId: string | null, recordingId: string | null) {
  const [status, setStatus] = useState<ExportStatus>('idle')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ExportResult | null>(null)

  const exportVideo = useCallback(
    async (config: ExportConfig): Promise<ExportResult> => {
      if (!studyId || !recordingId) {
        throw new Error('Study and recording IDs required')
      }

      setStatus('preparing')
      setProgress(0)
      setError(null)
      setResult(null)

      try {
        // Simulate progress while we wait for the server
        const progressInterval = setInterval(() => {
          setProgress((prev) => Math.min(prev + 5, 90))
        }, 500)

        setStatus('processing')

        const authFetch = getAuthFetchInstance()
        const response = await authFetch(
          `/api/studies/${studyId}/recordings/${recordingId}/export`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config),
          }
        )

        clearInterval(progressInterval)

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Export failed')
        }

        const data = await response.json()
        setProgress(100)
        setStatus('complete')
        setResult(data)
        return data
      } catch (err) {
        setStatus('error')
        setError(err instanceof Error ? err.message : 'Export failed')
        throw err
      }
    },
    [studyId, recordingId]
  )

  const downloadExport = useCallback(() => {
    if (result?.downloadUrl) {
      const link = document.createElement('a')
      link.href = result.downloadUrl
      link.download = result.fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }, [result])

  const reset = useCallback(() => {
    setStatus('idle')
    setProgress(0)
    setError(null)
    setResult(null)
  }, [])

  return {
    status,
    progress,
    error,
    result,
    exportVideo,
    downloadExport,
    reset,
    isExporting: status === 'preparing' || status === 'processing',
  }
}
