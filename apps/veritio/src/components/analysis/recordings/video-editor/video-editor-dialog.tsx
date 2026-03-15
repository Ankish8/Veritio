'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { X, Trash2, Loader2, Link2, ExternalLink } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { EditorLayout } from './editor-layout'
import { LayoutDropdown } from '../recording-player/layout-dropdown'
import type { RecordingLayout } from '../recording-player/dual-recording-player'
import { ShareDialog } from '../share-dialog'
import { ExportMenu } from '../export-menu'
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
import type { TaskEvent } from '../task-timeline/task-timeline'
import { toast } from '@/components/ui/sonner'

export interface VideoEditorDialogProps {
  /** Whether dialog is open */
  open: boolean
  /** Callback to close dialog */
  onOpenChange: (open: boolean) => void
  /** Study ID */
  studyId: string
  /** Current recording */
  recording: Recording | null
  /** All recordings for navigation */
  recordings: Recording[]
  /** Callback when recording selection changes via navigation */
  onRecordingChange?: (recording: Recording) => void
  /** Callback when delete is requested */
  onDelete?: (recordingId: string) => Promise<void>
}

/**
 * Professional video editor dialog with Loom/Tella-style interface.
 *
 * Layout:
 * - Large video preview with floating controls
 * - Full-width timeline at bottom
 * - Collapsible sidebar for Transcript/Comments/Tasks
 */
export function VideoEditorDialog({
  open,
  onOpenChange,
  studyId,
  recording,
  recordings: _recordings,
  onRecordingChange: _onRecordingChange,
  onDelete,
}: VideoEditorDialogProps) {
  // Playback URLs
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null)
  const [webcamPlaybackUrl, setWebcamPlaybackUrl] = useState<string | null>(null)
  const [isLoadingUrl, setIsLoadingUrl] = useState(false)

  // Video layout state
  const [videoLayout, setVideoLayout] = useState<RecordingLayout>('pip')

  // Share dialog state
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false)

  // Video editor store
  const setDuration = useVideoEditorStore((s) => s.setDuration)
  const setCurrentTime = useVideoEditorStore((s) => s.setCurrentTime)

  // Get current user for comments
  const { data: session } = useSession()
  const currentUserId = session?.user?.id || ''

  // Recording data hooks
  const { recording: recordingDetail, isLoading, getPlaybackUrl, getWebcamPlaybackUrl } = useRecording(
    studyId,
    recording?.id || ''
  )

  // Fetch recording events for timeline
  const { events: recordingEvents } = useRecordingEvents(
    studyId,
    recording?.id || ''
  )

  // Clips, comments, shares, and export hooks
  const {
    clips,
    isLoading: isLoadingClips,
    createClip,
    updateClip,
    trimClip,
    deleteClip,
  } = useRecordingClips(studyId, recording?.id || '')

  const {
    comments,
    isLoading: isLoadingComments,
    createComment,
    updateComment,
    deleteComment,
  } = useRecordingComments(studyId, recording?.id || '')

  const {
    shares,
    isLoading: isLoadingShares,
    createShare,
    revokeShare,
  } = useRecordingShares(studyId, recording?.id || '')

  const { exportTranscript, exportClips, exportBundle } = useRecordingExport(
    studyId,
    recording?.id || ''
  )

  // Extract task events for timeline
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

  // Load primary playback URL immediately when dialog opens (parallel with SWR)
  useEffect(() => {
    if (open && recording && !playbackUrl && !isLoadingUrl) {
      let cancelled = false
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsLoadingUrl(true)

      getPlaybackUrl()
        .then((url) => {
          if (!cancelled) setPlaybackUrl(url)
        })
        .catch(err => {
          if (!cancelled) {
            toast.error('Failed to load playback URL', {
              description: err.message,
            })
          }
        })
        .finally(() => {
          if (!cancelled) setIsLoadingUrl(false)
        })

      return () => { cancelled = true }
    }
  }, [open, recording, playbackUrl, isLoadingUrl, getPlaybackUrl])

  // Load webcam URL once SWR recording detail is available (needs webcam_recording.id)
  useEffect(() => {
    if (open && recordingDetail && !webcamPlaybackUrl) {
      let cancelled = false

      getWebcamPlaybackUrl()
        .then((url) => {
          if (!cancelled && url) setWebcamPlaybackUrl(url)
        })
        .catch(() => {}) // Webcam URL is optional

      return () => { cancelled = true }
    }
  }, [open, recordingDetail, webcamPlaybackUrl, getWebcamPlaybackUrl])

  // Set duration in store when recording changes
  useEffect(() => {
    if (recording?.duration_ms) {
      setDuration(recording.duration_ms)
    }
  }, [recording?.duration_ms, setDuration])

  // Reset when recording changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPlaybackUrl(null)
     
    setWebcamPlaybackUrl(null)
    setCurrentTime(0)
  }, [recording?.id, setCurrentTime])

  const handleDelete = useCallback(async () => {
    if (!recording || !onDelete) return

    try {
      await onDelete(recording.id)
      toast.success('Recording deleted')
      onOpenChange(false)
    } catch (error) {
      toast.error('Failed to delete recording', {
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }, [recording, onDelete, onOpenChange])

  // Check if audio was captured
  const hasAudio = recording?.capture_mode === 'audio' ||
    recording?.capture_mode === 'screen_audio' ||
    recording?.capture_mode === 'screen_audio_webcam'

  if (!recording) return null

  const transcript = recordingDetail?.transcript
  const segments = transcript?.segments || []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-none w-screen h-screen flex flex-col p-0 rounded-none"
        showCloseButton={false}
      >
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <DialogTitle>Recording Details</DialogTitle>
              <p className="text-sm text-muted-foreground">
                Participant {recording.participant_id?.slice(0, 8) || 'Unknown'} •{' '}
                {recording.capture_mode?.replace(/_/g, ' + ') || 'Unknown'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* Layout Controls */}
              <LayoutDropdown
                layout={videoLayout}
                onLayoutChange={setVideoLayout}
                hasWebcam={Boolean(webcamPlaybackUrl)}
              />

              {/* Actions */}
              <Button
                variant="outline"
                size="icon"
                onClick={() => setIsShareDialogOpen(true)}
                title="Share recording"
              >
                <Link2 className="h-4 w-4" />
              </Button>
              <ExportMenu
                studyId={studyId}
                recordingId={recording.id}
                hasTranscript={segments.length > 0}
                clipsCount={clips.length}
                onExportTranscript={exportTranscript}
                onExportClips={exportClips}
                onExportBundle={exportBundle}
              />
              {onDelete && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleDelete}
                  title="Delete recording"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              {recording && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    window.open(
                      `/recordings/${studyId}/${recording.id}`,
                      '_blank'
                    )
                    onOpenChange(false)
                  }}
                  title="Open in new tab"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Main Content */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {isLoading || (isLoadingUrl && !playbackUrl) ? (
            <div className="flex-1 h-full flex items-center justify-center">
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
                status: transcript?.status as 'pending' | 'processing' | 'completed' | 'failed' | undefined,
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
      </DialogContent>
    </Dialog>
  )
}
