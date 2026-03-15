'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Trash2, Loader2, Link2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { EditorLayout } from './video-editor/editor-layout'
import { LayoutDropdown } from './recording-player/layout-dropdown'
import type { RecordingLayout } from './recording-player/dual-recording-player'
import { ShareDialog } from './share-dialog'
import { ExportMenu } from './export-menu'
import { useRecording } from '@/hooks/use-recording'
import { useRecordingEvents } from '@/hooks/use-recording-events'
import {
  useRecordingClips,
  useRecordingComments,
  useRecordingShares,
  useRecordingExport,
} from '@/hooks'
import { useSession } from '@veritio/auth/client'
import { useVideoEditorStore } from '@/stores/video-editor-store'
import type { Recording } from '@/hooks/use-recordings'
import type { TaskEvent } from './task-timeline/task-timeline'
import { toast } from '@/components/ui/sonner'

interface RecordingPlayerPanelProps {
  studyId: string
  recording: Recording
  onDelete?: (recordingId: string) => Promise<void>
}

export function RecordingPlayerPanel({ studyId, recording, onDelete }: RecordingPlayerPanelProps) {
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null)
  const [webcamPlaybackUrl, setWebcamPlaybackUrl] = useState<string | null>(null)
  const [isLoadingUrl, setIsLoadingUrl] = useState(false)
  const [videoLayout, setVideoLayout] = useState<RecordingLayout>('pip')
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false)

  const setDuration = useVideoEditorStore((s) => s.setDuration)
  const setCurrentTime = useVideoEditorStore((s) => s.setCurrentTime)
  const setIsPlaying = useVideoEditorStore((s) => s.setIsPlaying)
  const clearClipCreation = useVideoEditorStore((s) => s.clearClipCreation)
  const clearSelection = useVideoEditorStore((s) => s.clearSelection)

  const { data: session } = useSession()
  const currentUserId = session?.user?.id || ''

  const { recording: recordingDetail, isLoading, getPlaybackUrl, getWebcamPlaybackUrl, regenerateTranscript } = useRecording(
    studyId,
    recording.id
  )

  const { events: recordingEvents } = useRecordingEvents(studyId, recording.id)

  const {
    clips,
    isLoading: isLoadingClips,
    createClip,
    updateClip,
    trimClip,
    deleteClip,
  } = useRecordingClips(studyId, recording.id)

  const {
    comments,
    isLoading: isLoadingComments,
    createComment,
    updateComment,
    deleteComment,
  } = useRecordingComments(studyId, recording.id)

  const {
    shares,
    isLoading: isLoadingShares,
    createShare,
    revokeShare,
  } = useRecordingShares(studyId, recording.id)

  const { exportTranscript, exportClips, exportBundle } = useRecordingExport(studyId, recording.id)

  const taskEvents = useMemo((): TaskEvent[] => {
    if (!recordingEvents || recordingEvents.length === 0) return []
    return recordingEvents
      .filter(e => e.event_type === 'task_end')
      .map(e => ({
        task_id: (e.data as any)?.task_id as string || '',
        task_title: (e.data as any)?.task_title as string || 'Unknown Task',
        timestamp_ms: e.timestamp_ms,
        outcome: (e.data?.outcome as TaskEvent['outcome']) || 'success',
      }))
  }, [recordingEvents])

  // Reset state when switching recordings (must be declared before URL-load effect)
  useEffect(() => {
    setPlaybackUrl(null)
    setWebcamPlaybackUrl(null)
    setCurrentTime(0)
    setDuration(0)
    setIsPlaying(false)
    clearClipCreation()
    clearSelection()
  }, [recording.id, setCurrentTime, setDuration, setIsPlaying, clearClipCreation, clearSelection])

  // Load playback URL (runs after reset effect in same render cycle)
  useEffect(() => {
    if (!recording || playbackUrl) return
    let cancelled = false
    setIsLoadingUrl(true)

    getPlaybackUrl()
      .then((url) => { if (!cancelled) setPlaybackUrl(url) })
      .catch(err => {
        if (!cancelled) {
          toast.error('Failed to load playback URL', { description: err.message })
        }
      })
      .finally(() => { if (!cancelled) setIsLoadingUrl(false) })

    return () => { cancelled = true }
  }, [recording.id, getPlaybackUrl]) // eslint-disable-line react-hooks/exhaustive-deps

  // Load webcam URL once detail is available
  useEffect(() => {
    if (!recordingDetail || webcamPlaybackUrl) return
    let cancelled = false

    getWebcamPlaybackUrl()
      .then((url) => { if (!cancelled && url) setWebcamPlaybackUrl(url) })
      .catch(() => {})

    return () => { cancelled = true }
  }, [recordingDetail, getWebcamPlaybackUrl]) // eslint-disable-line react-hooks/exhaustive-deps

  // Set duration when recording changes
  useEffect(() => {
    if (recording?.duration_ms) {
      setDuration(recording.duration_ms)
    }
  }, [recording?.duration_ms, setDuration])

  const handleDelete = useCallback(async () => {
    if (!onDelete) return
    await onDelete(recording.id)
  }, [recording.id, onDelete])

  const hasAudio = recording.capture_mode === 'audio' ||
    recording.capture_mode === 'screen_audio' ||
    recording.capture_mode === 'screen_audio_webcam'

  const transcript = recordingDetail?.transcript

  // If transcript has been "processing" for more than 3 minutes, treat as failed
  const effectiveTranscriptStatus = useMemo(() => {
    const status = transcript?.status
    if ((status === 'processing' || status === 'pending') && transcript?.updated_at) {
      const updatedAt = new Date(transcript.updated_at).getTime()
      const staleAfterMs = 3 * 60 * 1000 // 3 minutes
      if (Date.now() - updatedAt > staleAfterMs) return 'failed' // eslint-disable-line react-hooks/purity
    }
    return status
  }, [transcript?.status, transcript?.updated_at])

  const segments = transcript?.segments || []

  const actionButtons = (
    <TooltipProvider delayDuration={300}>
      <LayoutDropdown
        layout={videoLayout}
        onLayoutChange={setVideoLayout}
        hasWebcam={recording.capture_mode === 'screen_audio_webcam'}
      />
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsShareDialogOpen(true)}>
            <Link2 className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Share</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <span>
            <ExportMenu
              studyId={studyId}
              recordingId={recording.id}
              hasTranscript={segments.length > 0}
              clipsCount={clips.length}
              playbackUrl={playbackUrl}
              onExportTranscript={exportTranscript}
              onExportClips={exportClips}
              onExportBundle={exportBundle}
            />
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom">Export</TooltipContent>
      </Tooltip>
      {onDelete && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Delete</TooltipContent>
        </Tooltip>
      )}
    </TooltipProvider>
  )

  return (
    <div className="flex-1 flex flex-col min-w-0 min-h-0">
      {/* Player content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {isLoading || (isLoadingUrl && !playbackUrl) ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <EditorLayout
            recording={recording}
            playbackUrl={playbackUrl}
            webcamPlaybackUrl={webcamPlaybackUrl}
            clips={clips}
            comments={comments}
            taskEvents={taskEvents}
            transcript={{
              segments,
              status: effectiveTranscriptStatus as 'pending' | 'processing' | 'completed' | 'failed' | 'no_speech_detected' | 'retrying' | undefined,
              language: transcript?.language ?? undefined,
              wordCount: transcript?.word_count ?? undefined,
            }}
            hasAudio={hasAudio}
            currentUserId={currentUserId}
            isLoadingClips={isLoadingClips}
            isLoadingComments={isLoadingComments}
            onCreateClip={createClip}
            onUpdateClip={updateClip}
            onTrimClip={trimClip}
            onDeleteClip={deleteClip}
            onCreateComment={createComment}
            onUpdateComment={updateComment}
            onDeleteComment={deleteComment}
            shares={shares}
            isLoadingShares={isLoadingShares}
            onCreateShare={createShare}
            onRevokeShare={revokeShare}
            layout={videoLayout}
            onLayoutChange={setVideoLayout}
            actionButtons={actionButtons}
            onRegenerate={async () => {
              try {
                await regenerateTranscript()
                toast.success('Transcript regeneration started', { description: 'This usually takes 1-2 minutes.' })
              } catch (err) {
                toast.error('Failed to regenerate transcript', { description: err instanceof Error ? err.message : 'Unknown error' })
              }
            }}
          />
        )}
      </div>

      {/* Share Dialog */}
      <ShareDialog
        open={isShareDialogOpen}
        onOpenChange={setIsShareDialogOpen}
        recordingId={recording.id}
        shares={shares}
        isLoading={isLoadingShares}
        onCreate={createShare}
        onRevoke={revokeShare}
      />
    </div>
  )
}
