'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { X, Trash2, Loader2, Link2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EditorLayout } from '@/components/analysis/recordings/video-editor/editor-layout'
import { LayoutDropdown } from '@/components/analysis/recordings/recording-player/layout-dropdown'
import type { RecordingLayout } from '@/components/analysis/recordings/recording-player/dual-recording-player'
import { ShareDialog } from '@/components/analysis/recordings/share-dialog'
import { ExportMenu } from '@/components/analysis/recordings/export-menu'
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
import type { TaskEvent } from '@/components/analysis/recordings/task-timeline/task-timeline'
import { toast } from '@/components/ui/sonner'
import { useRecordings } from '@/hooks/use-recordings'

interface RecordingPageClientProps {
  studyId: string
  recordingId: string
}

export function RecordingPageClient({ studyId, recordingId }: RecordingPageClientProps) {
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


  // Get current user for comments
  const { data: session } = useSession()
  const currentUserId = session?.user?.id || ''

  // Delete hook
  const { deleteRecording } = useRecordings(studyId)

  // Recording data hooks
  const { recording: recordingDetail, isLoading, getPlaybackUrl, getWebcamPlaybackUrl } = useRecording(
    studyId,
    recordingId
  )

  // Fetch recording events for timeline
  const { events: recordingEvents } = useRecordingEvents(studyId, recordingId)

  // Clips, comments, shares, and export hooks
  const {
    clips,
    isLoading: isLoadingClips,
    createClip,
    updateClip,
    trimClip,
    deleteClip,
  } = useRecordingClips(studyId, recordingId)

  const {
    comments,
    isLoading: isLoadingComments,
    createComment,
    updateComment,
    deleteComment,
  } = useRecordingComments(studyId, recordingId)

  const {
    shares,
    isLoading: isLoadingShares,
    createShare,
    revokeShare,
  } = useRecordingShares(studyId, recordingId)

  const { exportTranscript, exportClips, exportBundle } = useRecordingExport(studyId, recordingId)

  const recording = recordingDetail

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

  // Load playback URLs when recording detail is loaded
  useEffect(() => {
    if (recordingDetail && !playbackUrl && !isLoadingUrl) {
      let cancelled = false
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsLoadingUrl(true)

      Promise.all([
        getPlaybackUrl(),
        getWebcamPlaybackUrl(),
      ])
        .then(([primaryUrl, webcamUrl]) => {
          if (!cancelled) {
            setPlaybackUrl(primaryUrl)
            setWebcamPlaybackUrl(webcamUrl)
          }
        })
        .catch(err => {
          if (!cancelled) {
            toast.error('Failed to load playback URLs', {
              description: err.message,
            })
          }
        })
        .finally(() => {
          if (!cancelled) {
            setIsLoadingUrl(false)
          }
        })

      return () => {
        cancelled = true
      }
    }
  }, [recordingDetail, playbackUrl, isLoadingUrl, getPlaybackUrl, getWebcamPlaybackUrl])

  // Set duration in store when recording changes
  useEffect(() => {
    if (recording?.duration_ms) {
      setDuration(recording.duration_ms)
    }
  }, [recording?.duration_ms, setDuration])

  const handleDelete = useCallback(async () => {
    if (!recordingId) return

    try {
      await deleteRecording(recordingId)
      toast.success('Recording deleted')
      window.close()
    } catch (error) {
      toast.error('Failed to delete recording', {
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }, [recordingId, deleteRecording])

  const handleClose = useCallback(() => {
    window.close()
  }, [])

  // Check if audio was captured
  const hasAudio = recording?.capture_mode === 'audio' ||
    recording?.capture_mode === 'screen_audio' ||
    recording?.capture_mode === 'screen_audio_webcam'

  const transcript = recordingDetail?.transcript
  const segments = transcript?.segments || []

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="px-6 py-4 border-b flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-lg font-semibold">Recording Details</h1>
            <p className="text-sm text-muted-foreground">
              Participant {recording?.participant_id?.slice(0, 8) || 'Unknown'} •{' '}
              {recording?.capture_mode?.replace(/_/g, ' + ') || 'Unknown'}
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
              recordingId={recordingId}
              hasTranscript={segments.length > 0}
              clipsCount={clips.length}
              onExportTranscript={exportTranscript}
              onExportClips={exportClips}
              onExportBundle={exportBundle}
            />
            <Button
              variant="outline"
              size="icon"
              onClick={handleDelete}
              title="Delete recording"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              title="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {isLoading || isLoadingUrl ? (
          <div className="flex-1 h-full flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : recording ? (
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
        ) : (
          <div className="flex-1 h-full flex items-center justify-center">
            <p className="text-muted-foreground">Recording not found</p>
          </div>
        )}
      </div>

      {/* Share Dialog */}
      <ShareDialog
        open={isShareDialogOpen}
        onOpenChange={setIsShareDialogOpen}
        recordingId={recordingId}
        shares={shares}
        isLoading={isLoadingShares}
        onCreate={createShare}
        onRevoke={revokeShare}
      />
    </div>
  )
}
