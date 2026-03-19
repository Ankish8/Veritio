'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import type { MediaPlayerInstance } from '@vidstack/react'
import { VideoPreviewArea } from './video-preview-area'
import { UnifiedControlBar } from './unified-control-bar'
import { EditorSidebar } from './sidebar/editor-sidebar'
import { useVideoEditorStore } from '@/stores/video-editor-store'
import type { Recording } from '@/hooks/use-recordings'
import type { TaskEvent } from '../task-timeline/task-timeline'
import type { Share } from '../share-dialog'
import type { RecordingLayout } from '../recording-player/dual-recording-player'
import type { TranscriptData, Clip, Comment } from './types'

export interface EditorLayoutProps {
  recording: Recording
  playbackUrl: string | null
  webcamPlaybackUrl: string | null
  clips: Clip[]
  comments: Comment[]
  taskEvents: TaskEvent[]
  transcript: TranscriptData
  hasAudio: boolean
  currentUserId: string
  isLoadingClips: boolean
  isLoadingComments: boolean
  onCreateClip: (data: { startMs: number; endMs: number; title: string; description?: string }) => Promise<unknown>
  onUpdateClip: (id: string, data: { title: string; description?: string }) => Promise<unknown>
  onTrimClip: (id: string, startMs: number, endMs: number) => Promise<unknown>
  onDeleteClip: (id: string) => Promise<void>
  onCreateComment: (data: { content: string; timestampMs?: number }) => Promise<unknown>
  onUpdateComment: (id: string, content: string) => Promise<unknown>
  onDeleteComment: (id: string) => Promise<void>
  /** Share management for clip sharing */
  shares: Share[]
  isLoadingShares: boolean
  onCreateShare: (data: {
    accessLevel: 'view' | 'comment'
    password?: string
    expiresInDays?: number
  }) => Promise<{ shareCode: string }>
  onRevokeShare: (id: string) => Promise<void>
  /** Video layout mode */
  layout?: RecordingLayout
  /** Callback when layout changes */
  onLayoutChange?: (layout: RecordingLayout) => void
  /** Action buttons to render in the sidebar tab bar */
  actionButtons?: React.ReactNode
  /** Callback to regenerate transcript */
  onRegenerate?: () => Promise<void>
}

/**
 * Main editor layout with three zones:
 * 1. Video preview area (large, takes most of space)
 * 2. Timeline panel (fixed height at bottom)
 * 3. Collapsible sidebar (right)
 */
export function EditorLayout({
  recording,
  playbackUrl,
  webcamPlaybackUrl,
  clips,
  comments,
  taskEvents,
  transcript,
  hasAudio,
  currentUserId,
  isLoadingClips,
  isLoadingComments,
  onCreateClip,
  onUpdateClip: _onUpdateClip,
  onTrimClip: _onTrimClip,
  onDeleteClip,
  onCreateComment,
  onUpdateComment,
  onDeleteComment,
  shares,
  isLoadingShares,
  onCreateShare,
  onRevokeShare,
  layout,
  onLayoutChange,
  actionButtons,
  onRegenerate,
}: EditorLayoutProps) {
  // External seek request state
  const [externalSeekTime, setExternalSeekTime] = useState<number | undefined>(undefined)

  // Sidebar state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [sidebarWidth, setSidebarWidth] = useState(380)
  const [isDraggingSidebar, setIsDraggingSidebar] = useState(false)
  const [activeTab, setActiveTab] = useState<'transcript' | 'comments' | 'clips'>('transcript')

  // Clip playback state
  const [playingClipId, setPlayingClipId] = useState<string | null>(null)
  const [activeClipEndMs, setActiveClipEndMs] = useState<number | null>(null)
  // Use ref for start time since we only need it in the effect check, not to trigger re-renders
  const activeClipStartMsRef = useRef<number | null>(null)
  // Track if we've confirmed the seek completed (seen currentTime near clip start)
  const clipPlaybackConfirmedRef = useRef(false)

  // Detected duration from the actual video (may be more accurate than database value)
  const [detectedDuration, setDetectedDuration] = useState<number | null>(null)

  // URL handling for shared clip links
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const sharedClipId = searchParams.get('clip')
  const [hasHandledSharedClip, setHasHandledSharedClip] = useState(false)

  // Video editor store
  const currentTime = useVideoEditorStore((s) => s.currentTime)
  const setCurrentTime = useVideoEditorStore((s) => s.setCurrentTime)
  const isPlaying = useVideoEditorStore((s) => s.isPlaying)
  const setIsPlaying = useVideoEditorStore((s) => s.setIsPlaying)
  const playbackRate = useVideoEditorStore((s) => s.playbackRate)
  const setPlaybackRate = useVideoEditorStore((s) => s.setPlaybackRate)
  const seekTo = useVideoEditorStore((s) => s.seekTo)
  const setInPointAtPlayhead = useVideoEditorStore((s) => s.setInPointAtPlayhead)
  const setOutPointAtPlayhead = useVideoEditorStore((s) => s.setOutPointAtPlayhead)

  // Refs
  const containerRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<MediaPlayerInstance | null>(null)

  // Handle sidebar resize
  useEffect(() => {
    if (!isDraggingSidebar) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const newWidth = Math.min(Math.max(rect.right - e.clientX, 280), 600)
      setSidebarWidth(newWidth)
    }

    const handleMouseUp = () => {
      setIsDraggingSidebar(false)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDraggingSidebar])

  // Handle time update from player (guard against invalid values from WebM metadata)
  const handleTimeUpdate = useCallback((time: number) => {
    if (Number.isFinite(time) && time >= 0) {
      setCurrentTime(time)
    }
  }, [setCurrentTime])

  // Handle seek requests from sidebar (transcript, comments, tasks)
  const handleSeek = useCallback((time: number) => {
    setExternalSeekTime(time)
    seekTo(time)
  }, [seekTo])

  // Clear external seek after player processes it
  const handleSeekComplete = useCallback(() => {
    setExternalSeekTime(undefined)
  }, [])

  // Handle play state changes from player
  const handlePlayStateChange = useCallback((playing: boolean) => {
    setIsPlaying(playing)
  }, [setIsPlaying])

  // Handle playback toggle for unified control bar
  const handleTogglePlayback = useCallback(() => {
    if (!playerRef.current) return
    if (isPlaying) {
      playerRef.current.pause()
    } else {
      playerRef.current.play()
    }
  }, [isPlaying])

  // Handle seek from unified control bar (in ms)
  const handleControlBarSeek = useCallback((timeMs: number) => {
    if (!playerRef.current) return
    playerRef.current.currentTime = timeMs / 1000
    setExternalSeekTime(timeMs)
  }, [])

  // Handle playback rate change
  const handlePlaybackRateChange = useCallback((rate: number) => {
    if (!playerRef.current) return
    playerRef.current.playbackRate = rate
    setPlaybackRate(rate)
  }, [setPlaybackRate])

  // Handle actual video duration detection (may differ from database value)
  // Guard against invalid values - WebM containers can report Infinity duration
  const handleDurationDetected = useCallback((durationMs: number) => {
    // Reject invalid values (NaN, Infinity, negative, zero, or unreasonably large)
    if (!Number.isFinite(durationMs) || durationMs <= 0 || durationMs > 86400000) {
      return // Ignore invalid duration (> 24 hours is likely wrong metadata)
    }

    setDetectedDuration(prev => {
      // Only update if the new duration is smaller (more accurate) or we don't have one yet
      if (!prev || durationMs < prev) {
        return durationMs
      }
      return prev
    })
  }, [])

  // Play a specific clip segment
  const handlePlayClip = useCallback((clip: Clip) => {
    if (!playerRef.current) return

    // Seek to clip start
    playerRef.current.currentTime = clip.start_ms / 1000
    setExternalSeekTime(clip.start_ms)

    // Start playback
    playerRef.current.play()

    // Track the active clip for auto-stop
    setPlayingClipId(clip.id)
    setActiveClipEndMs(clip.end_ms)
    activeClipStartMsRef.current = clip.start_ms
    // Reset confirmation - will be set when we see currentTime near start
    clipPlaybackConfirmedRef.current = false
  }, [])

  // Stop clip playback
  const handleStopClip = useCallback(() => {
    if (playerRef.current) {
      playerRef.current.pause()
    }
    setPlayingClipId(null)
    setActiveClipEndMs(null)
    activeClipStartMsRef.current = null
    clipPlaybackConfirmedRef.current = false
  }, [])

  // Auto-stop when clip reaches its end time
  useEffect(() => {
    if (playingClipId && activeClipEndMs !== null && activeClipStartMsRef.current !== null) {
      const clipStartMs = activeClipStartMsRef.current

      // First, confirm playback by checking if currentTime is near the clip start
      // This ensures the seek has completed before we allow auto-stop
      if (!clipPlaybackConfirmedRef.current) {
        const isNearStart = currentTime >= clipStartMs - 100 && currentTime <= clipStartMs + 1000
        if (isNearStart) {
          clipPlaybackConfirmedRef.current = true
        }
      }

      // Only stop if playback is confirmed (we've seen currentTime near start)
      if (clipPlaybackConfirmedRef.current) {
        const hasReachedEnd = currentTime >= activeClipEndMs
        const isNotFarPastEnd = currentTime <= activeClipEndMs + 1000

        if (hasReachedEnd && isNotFarPastEnd) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          handleStopClip()
        }
      }
    }
  }, [currentTime, playingClipId, activeClipEndMs, handleStopClip])

  // Note: We intentionally don't clear clip state when video is paused.
  // This allows users to pause mid-clip and resume without losing clip tracking.
  // The clip state is cleared when:
  // - Auto-stop triggers (currentTime >= activeClipEndMs)
  // - User clicks "Stop" on the clip
  // - User plays a different clip (handlePlayClip overwrites the state)

  // Handle shared clip links (?clip=<id>)
  useEffect(() => {
    if (!sharedClipId || hasHandledSharedClip || !clips.length || isLoadingClips) return

    const clip = clips.find(c => c.id === sharedClipId)
    if (!clip) return

    // Mark as handled to prevent re-triggering
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHasHandledSharedClip(true)

    // Switch to Clips tab
     
    setActiveTab('clips')

    // Wait a moment for player to be ready, then seek to clip start
    // Don't auto-play - browsers block autoplay without user interaction
    const timer = setTimeout(() => {
      if (playerRef.current) {
        // Seek to clip start position - user can click play when ready
        playerRef.current.currentTime = clip.start_ms / 1000
        setExternalSeekTime(clip.start_ms)

        // Clean up URL (remove clip param)
        router.replace(pathname, { scroll: false })
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [sharedClipId, hasHandledSharedClip, clips, isLoadingClips, pathname, router])

  return (
    <div
      ref={containerRef}
      data-fullscreen-container
      className="flex h-full bg-background"
    >
      {/* Main content area (video + controls) */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Video preview area - takes remaining space */}
        <div className="flex-1 min-h-0 relative">
          <VideoPreviewArea
            playbackUrl={playbackUrl}
            webcamPlaybackUrl={webcamPlaybackUrl}
            captureMode={recording.capture_mode}
            duration={recording.duration_ms || 0}
            taskEvents={taskEvents}
            onTimeUpdate={handleTimeUpdate}
            seekTo={externalSeekTime}
            onSeekComplete={handleSeekComplete}
            playerRef={playerRef}
            onPlayStateChange={handlePlayStateChange}
            onSetInPoint={setInPointAtPlayhead}
            onSetOutPoint={setOutPointAtPlayhead}
            onDurationDetected={handleDurationDetected}
            layout={layout}
            onLayoutChange={onLayoutChange}
          />
        </div>

        {/* Unified control bar at bottom */}
        <UnifiedControlBar
          duration={detectedDuration ?? recording.duration_ms ?? 0}
          currentTime={currentTime}
          isPlaying={isPlaying}
          playbackRate={playbackRate}
          clips={clips}
          comments={comments}
          taskEvents={taskEvents}
          onTogglePlayback={handleTogglePlayback}
          onSeek={handleControlBarSeek}
          onPlaybackRateChange={handlePlaybackRateChange}
          onCreateClip={async (data) => {
            const result = await onCreateClip(data)
            setActiveTab('clips')
            if (isSidebarCollapsed) setIsSidebarCollapsed(false)
            return result
          }}
        />
      </div>

      {/* Sidebar resize handle */}
      {!isSidebarCollapsed && (
        <div
          className="w-1.5 bg-muted hover:bg-muted/80 cursor-ew-resize flex-shrink-0 transition-colors"
          onMouseDown={() => setIsDraggingSidebar(true)}
        />
      )}

      {/* Collapsible sidebar */}
      <div
        className="flex-shrink-0 bg-muted/30 border-l"
        style={{ width: isSidebarCollapsed ? 48 : sidebarWidth }}
      >
        <EditorSidebar
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          transcript={transcript}
          comments={comments}
          taskEvents={taskEvents}
          clips={clips}
          hasAudio={hasAudio}
          currentUserId={currentUserId}
          currentTime={currentTime}
          isLoadingComments={isLoadingComments}
          isLoadingClips={isLoadingClips}
          playingClipId={playingClipId}
          playbackUrl={playbackUrl}
          shares={shares}
          isLoadingShares={isLoadingShares}
          onCreateShare={onCreateShare}
          onRevokeShare={onRevokeShare}
          onSeek={handleSeek}
          onPlayClip={handlePlayClip}
          onStopClip={handleStopClip}
          onCreateComment={onCreateComment}
          onUpdateComment={onUpdateComment}
          onDeleteComment={onDeleteComment}
          onDeleteClip={onDeleteClip}
          actionButtons={actionButtons}
          onRegenerate={onRegenerate}
        />
      </div>
    </div>
  )
}
