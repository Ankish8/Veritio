'use client'

import { useState, useEffect, useRef, useCallback, useMemo, use } from 'react'
import { useSearchParams } from 'next/navigation'
import { MediaPlayer, MediaProvider, type MediaPlayerInstance } from '@vidstack/react'
import { defaultLayoutIcons, DefaultVideoLayout } from '@vidstack/react/player/layouts/default'
import '@vidstack/react/player/styles/default/theme.css'
import '@vidstack/react/player/styles/default/layouts/video.css'
import { Play, Pause, Lock, AlertCircle, Loader2, MessageSquare, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useClipPlayback } from './use-clip-playback'
import { useShareComments } from './use-share-comments'

interface SharedRecordingData {
  recording: {
    id: string
    capture_mode: string
    duration_ms: number | null
    playback_url: string
  }
  transcript: {
    segments: Array<{ start: number; end: number; text: string }>
    full_text: string | null
  } | null
  clips?: Array<{
    id: string
    start_ms: number
    end_ms: number
    title: string
    description: string | null
  }>
  access_level: 'view' | 'comment'
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

export default function SharedRecordingPage({
  params,
}: {
  params: Promise<{ shareCode: string }>
}) {
  // Unwrap the params promise (Next.js 16+)
  const { shareCode } = use(params)

  const searchParams = useSearchParams()
  const clipId = searchParams.get('clip')

  const [data, setData] = useState<SharedRecordingData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [requiresPassword, setRequiresPassword] = useState(false)
  const [password, setPassword] = useState('')
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false)

  const [currentTime, setCurrentTime] = useState(0)
  const playerRef = useRef<MediaPlayerInstance>(null)
  const [hasAutoPlayed, setHasAutoPlayed] = useState(false)

  // Find the active clip for display (computed early so callbacks can reference it)
  const activeClip = useMemo(() => {
    return (clipId && data?.clips ? data.clips.find(c => c.id === clipId) : null) ?? null
  }, [clipId, data?.clips])

  // Clip playback with auto-stop and boundary enforcement
  const { isPlayingClip, handlePlayClip, handleStopClip, autoStartClip } = useClipPlayback({
    playerRef,
    activeClip,
    currentTime,
  })

  // Comments management
  const {
    comments,
    isLoadingComments,
    guestName,
    setGuestName,
    newComment,
    setNewComment,
    isSubmittingComment,
    handleSubmitComment,
    getDisplayName,
    setStoredPassword,
  } = useShareComments({
    shareCode,
    accessLevel: data?.access_level ?? null,
    currentTime,
  })

  // Fetch shared recording data
  const fetchRecording = useCallback(async (sharePassword?: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      if (sharePassword) {
        headers['x-share-password'] = sharePassword
      }

      const response = await fetch(`/api/share/recording/${shareCode}`, {
        headers,
      })

      const result = await response.json()

      if (!response.ok) {
        if (result.requires_password) {
          setRequiresPassword(true)
          setIsLoading(false)
          return
        }
        throw new Error(result.error || 'Failed to load recording')
      }

      setData(result)
      setRequiresPassword(false)
      // Store password for future API calls (used by comments hook)
      if (sharePassword) {
        setStoredPassword(sharePassword)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load recording')
    } finally {
      setIsLoading(false)
    }
  }, [shareCode, setStoredPassword])

  useEffect(() => { fetchRecording() }, [fetchRecording])

  // Handle password submission
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password.trim()) return

    setIsSubmittingPassword(true)
    await fetchRecording(password)
    setIsSubmittingPassword(false)
  }

  // Auto-play clip when shared clip link is opened
  useEffect(() => {
    if (!data || !clipId || hasAutoPlayed || !activeClip) return
    const timer = setTimeout(() => { autoStartClip(); setHasAutoPlayed(true) }, 500)
    return () => clearTimeout(timer)
  }, [data, clipId, hasAutoPlayed, activeClip, autoStartClip])

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Loading recording...</p>
        </div>
      </div>
    )
  }

  // Password required
  if (requiresPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-sm">
          <div className="bg-card border rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-center w-12 h-12 bg-muted rounded-full mx-auto mb-4">
              <Lock className="h-6 w-6 text-muted-foreground" />
            </div>
            <h1 className="text-xl font-semibold text-foreground text-center mb-2">
              Password Protected
            </h1>
            <p className="text-muted-foreground text-sm text-center mb-6">
              Enter the password to view this recording
            </p>
            <form onSubmit={handlePasswordSubmit}>
              <Input
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mb-4"
                autoFocus
              />
              <Button
                type="submit"
                className="w-full"
                disabled={!password.trim() || isSubmittingPassword}
              >
                {isSubmittingPassword ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Verifying...
                  </>
                ) : (
                  'Unlock Recording'
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center max-w-md">
          <div className="flex items-center justify-center w-12 h-12 bg-destructive/10 rounded-full mx-auto mb-4">
            <AlertCircle className="h-6 w-6 text-destructive" />
          </div>
          <h1 className="text-xl font-semibold text-foreground mb-2">
            Unable to Load Recording
          </h1>
          <p className="text-muted-foreground text-sm">
            {error}
          </p>
        </div>
      </div>
    )
  }

  // No data
  if (!data) {
    return null
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            {activeClip ? (
              <>
                <h1 className="text-foreground font-medium">{activeClip.title}</h1>
                <p className="text-muted-foreground text-sm">
                  Duration: {formatDuration(activeClip.end_ms - activeClip.start_ms)}
                  {activeClip.description && ` • ${activeClip.description}`}
                </p>
              </>
            ) : (
              <h1 className="text-foreground font-medium">Shared Recording</h1>
            )}
          </div>
          <div className="flex items-center gap-3">
            {/* Only show full recording duration if NOT viewing a clip */}
            {!activeClip && data.recording.duration_ms && (
              <span className="text-muted-foreground text-sm">
                {formatDuration(data.recording.duration_ms)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="w-full max-w-5xl">
              <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                {/* When viewing a clip, hide the default timeline since we show our own clip-relative progress bar */}
                {activeClip && <style>{`.vds-time-slider, .vds-time-group { display: none !important; }`}</style>}
                <MediaPlayer
                  ref={playerRef}
                  src={data.recording.playback_url}
                  viewType="video"
                  streamType="on-demand"
                  duration={data.recording.duration_ms ? data.recording.duration_ms / 1000 : undefined}
                  crossOrigin="anonymous"
                  playsInline
                  className="w-full h-full"
                  onTimeUpdate={(detail) => setCurrentTime(detail.currentTime * 1000)}
                >
                  <MediaProvider />
                  <DefaultVideoLayout icons={defaultLayoutIcons} />
                </MediaPlayer>
              </div>

              {/* Clip controls and progress */}
              {activeClip && (
                <div className="mt-4 p-4 bg-card border rounded-lg">
                  <div className="flex items-center gap-4">
                    {/* Play/Stop button */}
                    <Button
                      variant={isPlayingClip ? 'default' : 'secondary'}
                      size="icon"
                      className="h-10 w-10 flex-shrink-0"
                      onClick={isPlayingClip ? handleStopClip : handlePlayClip}
                    >
                      {isPlayingClip ? (
                        <Pause className="h-5 w-5" />
                      ) : (
                        <Play className="h-5 w-5" />
                      )}
                    </Button>

                    {/* Interactive progress bar and time display */}
                    <div className="flex-1 space-y-1">
                      {/* Seekable progress bar - click to seek within clip */}
                      <div
                        className="relative h-3 bg-muted rounded-full overflow-hidden cursor-pointer"
                        onClick={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect()
                          const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
                          if (playerRef.current) playerRef.current.currentTime = (activeClip.start_ms + pct * (activeClip.end_ms - activeClip.start_ms)) / 1000
                        }}>
                        <div
                          className="absolute inset-y-0 left-0 bg-primary rounded-full transition-all duration-100"
                          style={{ width: `${Math.min(100, Math.max(0, ((currentTime - activeClip.start_ms) / (activeClip.end_ms - activeClip.start_ms)) * 100))}%` }}
                        />
                      </div>
                      {/* Time display */}
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>
                          {formatDuration(Math.max(0, Math.min(currentTime - activeClip.start_ms, activeClip.end_ms - activeClip.start_ms)))}
                        </span>
                        <span>
                          {formatDuration(activeClip.end_ms - activeClip.start_ms)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Clip description if present */}
                  {activeClip.description && (
                    <p className="text-muted-foreground text-sm mt-3 border-t pt-3">
                      {activeClip.description}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="border-t px-4 py-3">
            <div className="max-w-5xl mx-auto">
              <p className="text-muted-foreground/70 text-xs text-center">
                Shared via Veritio Research Platform
              </p>
            </div>
          </div>
        </div>

        {/* Comments Sidebar */}
        {data.access_level === 'comment' && (
          <div className="w-80 border-l bg-card flex flex-col flex-shrink-0">
            {/* Comments Header */}
            <div className="flex items-center p-4 border-b">
              <h3 className="font-medium text-foreground flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Comments
                {comments.length > 0 && (
                  <span className="text-xs text-muted-foreground">({comments.length})</span>
                )}
              </h3>
            </div>

            {/* Comments List */}
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-3">
                {isLoadingComments ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : comments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No comments yet</p>
                    <p className="text-xs mt-1">Be the first to leave a comment</p>
                  </div>
                ) : (
                  comments.map((comment) => (
                    <div
                      key={comment.id}
                      className="p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className="flex items-start gap-2">
                        <Avatar className="h-7 w-7 flex-shrink-0">
                          {comment.author_image && <AvatarImage src={comment.author_image} alt={getDisplayName(comment)} />}
                          <AvatarFallback className="text-xs">
                            {getDisplayName(comment).split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-medium text-foreground truncate">
                              {getDisplayName(comment)}
                            </span>
                            {comment.timestamp_ms !== null && (
                              <button
                                onClick={() => playerRef.current && (playerRef.current.currentTime = comment.timestamp_ms! / 1000)}
                                className="text-xs text-primary hover:underline flex-shrink-0"
                              >
                                {formatDuration(comment.timestamp_ms)}
                              </button>
                            )}
                          </div>
                          <p className="text-sm text-foreground/80 mt-1 whitespace-pre-wrap break-words">
                            {comment.content}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1.5">
                            {new Date(comment.created_at).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>

            {/* Comment Input */}
            <div className="border-t p-4">
              <form onSubmit={handleSubmitComment} className="space-y-3">
                {/* Guest name input */}
                <Input
                  placeholder="Your name"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="text-sm"
                />

                {/* Comment input with timestamp indicator */}
                <div className="relative">
                  <Textarea
                    placeholder="Add a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="min-h-[80px] text-sm pr-10 resize-none"
                    rows={3}
                  />
                  <Button
                    type="submit"
                    size="icon"
                    className="absolute bottom-2 right-2 h-7 w-7"
                    disabled={!newComment.trim() || !guestName.trim() || isSubmittingComment}
                  >
                    {isSubmittingComment ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Send className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>

                {/* Current timestamp indicator */}
                <p className="text-xs text-muted-foreground">
                  Comment will be linked to {formatDuration(currentTime)}
                </p>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
