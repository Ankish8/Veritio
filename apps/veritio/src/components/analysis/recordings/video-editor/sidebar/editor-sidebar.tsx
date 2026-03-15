'use client'

import { useState, useMemo } from 'react'
import { FileText, Scissors, PanelLeftOpen, PanelRightClose, Play, Pause, Trash2, Link2, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TranscriptPanel } from '../../transcript-panel/transcript-panel'
import { CommentsTab } from '../../comments-tab'
import { ShareDialog, type Share } from '../../share-dialog'
import { cn } from '@/lib/utils'
import type { TaskEvent } from '../../task-timeline/task-timeline'
import { formatDuration } from '@/lib/utils'
import type { TranscriptData, Clip, Comment } from '../types'

export interface EditorSidebarProps {
  isCollapsed: boolean
  onToggleCollapse: () => void
  activeTab: 'transcript' | 'comments' | 'clips'
  onTabChange: (tab: 'transcript' | 'comments' | 'clips') => void
  transcript: TranscriptData
  comments: Comment[]
  taskEvents: TaskEvent[]
  clips: Clip[]
  hasAudio: boolean
  currentUserId: string
  currentTime: number
  isLoadingComments: boolean
  isLoadingClips: boolean
  /** Currently playing clip ID (for showing pause button) */
  playingClipId: string | null
  /** Playback URL for the video (for download) */
  playbackUrl: string | null
  /** Share management for clip sharing */
  shares: Share[]
  isLoadingShares: boolean
  onCreateShare: (data: {
    accessLevel: 'view' | 'comment'
    password?: string
    expiresInDays?: number
  }) => Promise<{ shareCode: string }>
  onRevokeShare: (id: string) => Promise<void>
  onSeek: (time: number) => void
  /** Play a clip segment (seeks to start and plays until end) */
  onPlayClip: (clip: Clip) => void
  /** Stop the currently playing clip */
  onStopClip: () => void
  onCreateComment: (data: { content: string; timestampMs?: number }) => Promise<unknown>
  onUpdateComment: (id: string, content: string) => Promise<unknown>
  onDeleteComment: (id: string) => Promise<void>
  onDeleteClip: (id: string) => Promise<void>
  /** Action buttons to render in the tab bar */
  actionButtons?: React.ReactNode
  /** Callback to regenerate transcript */
  onRegenerate?: () => Promise<void>
}

/**
 * Collapsible sidebar for Transcript, Comments, and Tasks.
 * Uses design system tokens for theme compatibility.
 */
// Pastel color palette for clips - used for both sidebar cards and timeline markers
// Each clip gets a unique color based on its index for visual matching
export const CLIP_PASTEL_COLORS = [
  { bg: 'bg-rose-100/80 dark:bg-rose-900/30', border: 'border-rose-200 dark:border-rose-800', timeline: 'bg-rose-400/60' },
  { bg: 'bg-sky-100/80 dark:bg-sky-900/30', border: 'border-sky-200 dark:border-sky-800', timeline: 'bg-sky-400/60' },
  { bg: 'bg-emerald-100/80 dark:bg-emerald-900/30', border: 'border-emerald-200 dark:border-emerald-800', timeline: 'bg-emerald-400/60' },
  { bg: 'bg-violet-100/80 dark:bg-violet-900/30', border: 'border-violet-200 dark:border-violet-800', timeline: 'bg-violet-400/60' },
  { bg: 'bg-amber-100/80 dark:bg-amber-900/30', border: 'border-amber-200 dark:border-amber-800', timeline: 'bg-amber-400/60' },
  { bg: 'bg-cyan-100/80 dark:bg-cyan-900/30', border: 'border-cyan-200 dark:border-cyan-800', timeline: 'bg-cyan-400/60' },
  { bg: 'bg-pink-100/80 dark:bg-pink-900/30', border: 'border-pink-200 dark:border-pink-800', timeline: 'bg-pink-400/60' },
  { bg: 'bg-indigo-100/80 dark:bg-indigo-900/30', border: 'border-indigo-200 dark:border-indigo-800', timeline: 'bg-indigo-400/60' },
] as const

export function getClipColor(index: number) {
  return CLIP_PASTEL_COLORS[index % CLIP_PASTEL_COLORS.length]
}

export function EditorSidebar({
  isCollapsed,
  onToggleCollapse,
  activeTab,
  onTabChange,
  transcript,
  comments,
  taskEvents,
  clips,
  hasAudio,
  currentUserId,
  currentTime,
  isLoadingComments,
  isLoadingClips,
  playingClipId,
  playbackUrl,
  shares,
  isLoadingShares,
  onCreateShare,
  onRevokeShare,
  onSeek,
  onPlayClip,
  onStopClip,
  onCreateComment,
  onUpdateComment,
  onDeleteComment,
  onDeleteClip,
  actionButtons,
  onRegenerate,
}: EditorSidebarProps) {
  // Build clip ID → title map for comment badges
  const clipNames = useMemo(() => {
    const map: Record<string, string> = {}
    for (const clip of clips) {
      map[clip.id] = clip.title
    }
    return map
  }, [clips])

  // Track clip share dialog state
  const [shareDialogClip, setShareDialogClip] = useState<Clip | null>(null)
  const [downloadingClipId, setDownloadingClipId] = useState<string | null>(null)

  // Download clip (for now, downloads full recording with timestamp info)
  const handleDownloadClip = async (clip: Clip) => {
    if (!playbackUrl) return

    setDownloadingClipId(clip.id)
    try {
      // Create a filename with clip info
      const startTime = formatDuration(clip.start_ms).replace(':', '-')
      const endTime = formatDuration(clip.end_ms).replace(':', '-')
      const safeName = clip.title.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30)
      const filename = `clip_${safeName}_${startTime}_to_${endTime}.webm`

      // Fetch the video and trigger download
      const response = await fetch(playbackUrl)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)

      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      // Download failed - user will see the button reset
    } finally {
      setDownloadingClipId(null)
    }
  }
  if (isCollapsed) {
    // Collapsed state - vertical tab buttons
    const tabs: { id: 'transcript' | 'comments' | 'clips'; label: string; disabled?: boolean }[] = [
      { id: 'transcript', label: 'Transcript', disabled: !hasAudio },
      { id: 'comments', label: 'Comments' },
      { id: 'clips', label: 'Clips' },
    ]

    return (
      <div className="flex flex-col h-full">
        {/* Expand button at top */}
        <button
          onClick={onToggleCollapse}
          className="flex items-center justify-center h-10 border-b hover:bg-muted transition-colors group"
          aria-label="Expand panel"
          title="Expand panel"
        >
          <PanelLeftOpen className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
        </button>

        {/* Vertical tab buttons */}
        <div className="flex-1 flex flex-col items-center py-3 gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                onTabChange(tab.id)
                onToggleCollapse()
              }}
              disabled={tab.disabled}
              className={cn(
                'w-full py-3 transition-colors flex flex-col items-center justify-center gap-0.5 border-l-2',
                activeTab === tab.id
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-transparent text-muted-foreground hover:bg-muted hover:text-foreground',
                tab.disabled && 'opacity-40 cursor-not-allowed'
              )}
              title={tab.label}
            >
              <span
                className="text-sm font-medium"
                style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
              >
                {tab.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // Expanded state
  return (
    <div className="flex flex-col h-full">
      {/* Toolbar row */}
      {actionButtons && (
        <div className="flex items-center justify-between bg-muted/40 border-b px-1 h-10">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onToggleCollapse}
            title="Collapse panel"
          >
            <PanelRightClose className="h-4 w-4 text-muted-foreground" />
          </Button>
          <div className="flex items-center">
            {actionButtons}
          </div>
        </div>
      )}

      {/* Tab bar */}
      <div className="flex items-center border-b px-2">
        <div className="flex h-10 items-center gap-0 flex-1">
          <button
            onClick={() => onTabChange('transcript')}
            disabled={!hasAudio}
            className={cn(
              'relative h-10 px-3 text-sm font-medium flex items-center border-b-2 transition-colors',
              activeTab === 'transcript'
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
              !hasAudio && 'opacity-40 cursor-not-allowed'
            )}
          >
            Transcript
          </button>
          <button
            onClick={() => onTabChange('comments')}
            className={cn(
              'relative h-10 px-3 text-sm font-medium flex items-center border-b-2 transition-colors',
              activeTab === 'comments'
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            Comments
            {comments.length > 0 && (
              <span className="ml-1.5 text-xs bg-muted text-muted-foreground rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center">
                {comments.length}
              </span>
            )}
          </button>
          <button
            onClick={() => onTabChange('clips')}
            className={cn(
              'relative h-10 px-3 text-sm font-medium flex items-center border-b-2 transition-colors',
              activeTab === 'clips'
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            Clips
            {clips.length > 0 && (
              <span className="ml-1.5 text-xs bg-muted text-muted-foreground rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center">
                {clips.length}
              </span>
            )}
          </button>
        </div>

        {!actionButtons && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onToggleCollapse}
            title="Collapse panel"
          >
            <PanelRightClose className="h-4 w-4 text-muted-foreground" />
          </Button>
        )}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'transcript' && (
          hasAudio ? (
            <TranscriptPanel
              segments={transcript.segments}
              currentTime={currentTime}
              onSegmentClick={onSeek}
              isLoading={false}
              status={transcript.status}
              language={transcript.language}
              wordCount={transcript.wordCount}
              taskEvents={taskEvents}
              onRegenerate={onRegenerate}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center p-8 text-center h-full">
              <div>
                <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                <p className="font-medium text-muted-foreground">No audio captured</p>
                <p className="text-sm text-muted-foreground/70">Transcripts require audio recording</p>
              </div>
            </div>
          )
        )}

        {activeTab === 'comments' && (
          <CommentsTab
            recordingId=""
            currentTimeMs={currentTime}
            comments={comments}
            isLoading={isLoadingComments}
            currentUserId={currentUserId}
            clipNames={clipNames}
            onTimestampClick={onSeek}
            onCreate={onCreateComment}
            onUpdate={onUpdateComment}
            onDelete={onDeleteComment}
          />
        )}

        {activeTab === 'clips' && (
          <div className="h-full overflow-y-auto p-4">
            {isLoadingClips ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            ) : clips.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Scissors className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                  <p className="font-medium text-muted-foreground">No clips yet</p>
                  <p className="text-sm text-muted-foreground/70">Use the "Create Clip" button to mark important moments</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {clips.map((clip, index) => {
                  const isPlaying = playingClipId === clip.id
                  const clipDurationMs = clip.end_ms - clip.start_ms
                  const colorScheme = getClipColor(index)

                  return (
                    <div
                      key={clip.id}
                      className={cn(
                        "relative p-3 rounded-lg border transition-colors",
                        colorScheme.bg,
                        isPlaying ? "border-primary ring-1 ring-primary" : colorScheme.border
                      )}
                    >
                      {/* Clip info */}
                      <div className="mb-3">
                        <p className="font-medium text-foreground">{clip.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatDuration(clip.start_ms)} → {formatDuration(clip.end_ms)}
                          <span className="text-muted-foreground/60 ml-1">
                            ({formatDuration(clipDurationMs)})
                          </span>
                        </p>
                        {clip.description && (
                          <p className="text-xs text-muted-foreground/70 mt-1.5 line-clamp-2">
                            {clip.description}
                          </p>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1">
                        <Button
                          variant={isPlaying ? "default" : "outline"}
                          size="sm"
                          className={cn(
                            "h-8 px-3 gap-1.5 text-sm font-medium",
                            !isPlaying && "bg-background hover:bg-muted"
                          )}
                          onClick={() => isPlaying ? onStopClip() : onPlayClip(clip)}
                        >
                          {isPlaying ? (
                            <><Pause className="h-3.5 w-3.5" /> Stop</>
                          ) : (
                            <><Play className="h-3.5 w-3.5" /> Play</>
                          )}
                        </Button>

                        <div className="flex-1" />

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => setShareDialogClip(clip)}
                          title="Share clip"
                        >
                          <Link2 className="h-4 w-4" />
                        </Button>

                        {playbackUrl && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => handleDownloadClip(clip)}
                            disabled={downloadingClipId === clip.id}
                            title="Download clip"
                          >
                            {downloadingClipId === clip.id ? (
                              <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Download className="h-4 w-4" />
                            )}
                          </Button>
                        )}

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => onDeleteClip(clip.id)}
                          title="Delete clip"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Clip Share Dialog */}
      <ShareDialog
        open={!!shareDialogClip}
        onOpenChange={(open) => !open && setShareDialogClip(null)}
        recordingId={shareDialogClip?.recording_id || ''}
        shares={shares}
        isLoading={isLoadingShares}
        onCreate={onCreateShare}
        onRevoke={onRevokeShare}
        clipId={shareDialogClip?.id}
        clipTitle={shareDialogClip?.title}
      />
    </div>
  )
}
