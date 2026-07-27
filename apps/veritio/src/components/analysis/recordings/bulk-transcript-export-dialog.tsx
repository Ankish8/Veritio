'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { toast } from '@/components/ui/sonner'
import { useAuthFetch } from '@/hooks/use-auth-fetch'

type ExportState = 'idle' | 'queued' | 'processing' | 'completed' | 'failed'

interface ExportJobStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  processed_participants: number | null
  total_participants: number | null
  resource_url: string | null
  error_message: string | null
}

interface BulkTranscriptExportDialogProps {
  studyId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  recordingIds?: string[]
}

function triggerDownload(url: string) {
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.rel = 'noopener noreferrer'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
}

export function BulkTranscriptExportDialog({
  studyId,
  open,
  onOpenChange,
  recordingIds,
}: BulkTranscriptExportDialogProps) {
  const authFetch = useAuthFetch()
  const [includeTxt, setIncludeTxt] = useState(true)
  const [includeJson, setIncludeJson] = useState(false)
  const [includeTimestamps, setIncludeTimestamps] = useState(true)
  const [includeSpeakers, setIncludeSpeakers] = useState(true)
  const [state, setState] = useState<ExportState>('idle')
  const [jobId, setJobId] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const downloadedJobRef = useRef<string | null>(null)

  const reset = useCallback(() => {
    setState('idle')
    setJobId(null)
    setProgress(0)
    setDownloadUrl(null)
    setError(null)
    downloadedJobRef.current = null
  }, [])

  useEffect(() => {
    if (!jobId || (state !== 'queued' && state !== 'processing')) return

    let cancelled = false
    const poll = async () => {
      try {
        const response = await authFetch(`/api/export-jobs/${jobId}/status`)
        if (!response.ok) throw new Error('Failed to check export status')
        const job = (await response.json()) as ExportJobStatus
        if (cancelled) return

        const total = job.total_participants ?? 0
        const processed = job.processed_participants ?? 0
        setProgress(total === 0 ? (job.status === 'completed' ? 100 : 10) : Math.round((processed / total) * 100))

        if (job.status === 'completed' && job.resource_url) {
          setState('completed')
          setProgress(100)
          setDownloadUrl(job.resource_url)
          if (downloadedJobRef.current !== jobId) {
            downloadedJobRef.current = jobId
            triggerDownload(job.resource_url)
            toast.success('Transcript ZIP is ready')
          }
          return
        }
        if (job.status === 'failed' || job.status === 'cancelled') {
          setState('failed')
          setError(job.error_message || 'Transcript export failed')
          return
        }
        setState(job.status === 'processing' ? 'processing' : 'queued')
      } catch (pollError) {
        if (!cancelled) {
          setState('failed')
          setError(
            pollError instanceof Error
              ? pollError.message
              : 'Failed to check export status'
          )
        }
      }
    }

    void poll()
    const interval = window.setInterval(() => void poll(), 1500)
    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [authFetch, jobId, state])

  const startExport = useCallback(async () => {
    if (!includeTxt && !includeJson) return
    setState('queued')
    setProgress(0)
    setError(null)
    setDownloadUrl(null)
    try {
      const response = await authFetch(`/api/studies/${studyId}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          integration: 'transcript_zip',
          format: 'raw',
          config: {
            formats: [
              ...(includeTxt ? ['txt'] : []),
              ...(includeJson ? ['json'] : []),
            ],
            includeTimestamps,
            includeSpeakers,
            ...(recordingIds?.length ? { recordingIds } : {}),
          },
        }),
      })
      const body = await response.json()
      if (!response.ok) {
        throw new Error(body.error || 'Failed to start transcript export')
      }
      setJobId(body.jobId)
      toast.success('Transcript export queued')
    } catch (startError) {
      setState('failed')
      setError(
        startError instanceof Error
          ? startError.message
          : 'Failed to start transcript export'
      )
    }
  }, [
    authFetch,
    includeJson,
    includeSpeakers,
    includeTimestamps,
    includeTxt,
    recordingIds,
    studyId,
  ])

  const isRunning = state === 'queued' || state === 'processing'

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen)
        if (!nextOpen && !isRunning) reset()
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Download transcripts</DialogTitle>
          <DialogDescription>
            Create one ZIP containing every completed transcript. A manifest
            records anything skipped or failed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <fieldset className="space-y-3" disabled={isRunning}>
            <legend className="mb-2 text-sm font-medium">File formats</legend>
            <div className="flex items-center gap-2">
              <Checkbox
                id="transcript-format-txt"
                checked={includeTxt}
                onCheckedChange={(checked) => setIncludeTxt(checked === true)}
              />
              <Label htmlFor="transcript-format-txt">Plain text (TXT)</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="transcript-format-json"
                checked={includeJson}
                onCheckedChange={(checked) => setIncludeJson(checked === true)}
              />
              <Label htmlFor="transcript-format-json">Structured data (JSON)</Label>
            </div>
          </fieldset>

          <fieldset className="space-y-3" disabled={isRunning}>
            <legend className="mb-2 text-sm font-medium">Transcript details</legend>
            <div className="flex items-center gap-2">
              <Checkbox
                id="transcript-timestamps"
                checked={includeTimestamps}
                onCheckedChange={(checked) =>
                  setIncludeTimestamps(checked === true)
                }
              />
              <Label htmlFor="transcript-timestamps">Include timestamps</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="transcript-speakers"
                checked={includeSpeakers}
                onCheckedChange={(checked) =>
                  setIncludeSpeakers(checked === true)
                }
              />
              <Label htmlFor="transcript-speakers">Include speaker names</Label>
            </div>
          </fieldset>

          {(isRunning || state === 'completed') && (
            <div className="space-y-2" aria-live="polite">
              <div className="flex justify-between text-sm">
                <span>
                  {state === 'completed'
                    ? 'Ready'
                    : state === 'queued'
                      ? 'Queued'
                      : 'Building archive'}
                </span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {isRunning ? 'Close' : 'Cancel'}
          </Button>
          {state === 'completed' && downloadUrl ? (
            <Button onClick={() => triggerDownload(downloadUrl)}>
              <Download className="mr-2 h-4 w-4" />
              Download ZIP
            </Button>
          ) : (
            <Button
              onClick={() => void startExport()}
              disabled={isRunning || (!includeTxt && !includeJson)}
            >
              {isRunning ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              {state === 'failed' ? 'Try again' : 'Create ZIP'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
