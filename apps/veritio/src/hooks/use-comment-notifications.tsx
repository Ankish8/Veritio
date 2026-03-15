'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRealtimeComments } from './use-realtime-comments'
import { useFloatingActionBar } from '@/components/analysis/shared/floating-action-bar'
import { toast as hotToast } from 'react-hot-toast'

function playNotificationSound() {
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()

    // Create oscillator for the tone
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    oscillator.frequency.setValueAtTime(830, audioContext.currentTime)
    oscillator.type = 'sine'

    gainNode.gain.setValueAtTime(0, audioContext.currentTime)
    gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)

    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.3)

    oscillator.onended = () => {
      audioContext.close()
    }
  } catch {
    // Silently fail if audio isn't available
  }
}

interface UseCommentNotificationsOptions {
  /** Current user ID to identify own messages */
  currentUserId?: string
  /** Whether notifications are enabled (default: true) */
  enabled?: boolean
}

/** Hook for managing comment notifications and unread state. */
export function useCommentNotifications(
  studyId: string | null,
  options: UseCommentNotificationsOptions = {}
) {
  const { currentUserId, enabled = true } = options
  const [unreadCount, setUnreadCount] = useState(0)
  const { activePanel, setActivePanel } = useFloatingActionBar()
  const isCommentsPanelOpen = activePanel === 'study-comments'

  const wasPanelOpenRef = useRef(false)

  useEffect(() => {
    if (isCommentsPanelOpen && !wasPanelOpenRef.current) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUnreadCount(0)
    }
    wasPanelOpenRef.current = isCommentsPanelOpen
  }, [isCommentsPanelOpen])

  const openCommentsPanel = useCallback(() => {
    setActivePanel('study-comments')
  }, [setActivePanel])

  const handleNewComment = useCallback(
    (comment: { author_user_id: string; content: string }) => {
      if (!isCommentsPanelOpen) {
        setUnreadCount((prev) => prev + 1)

        playNotificationSound()

        const preview =
          comment.content.length > 60
            ? comment.content.slice(0, 60) + '...'
            : comment.content

        hotToast.custom(
          (t) => (
            <div
              className={`${
                t.visible ? 'animate-enter' : 'animate-leave'
              } max-w-xs w-full bg-card shadow-md rounded-lg pointer-events-auto flex overflow-hidden border border-border`}
            >
              <button
                onClick={() => {
                  openCommentsPanel()
                  hotToast.dismiss(t.id)
                }}
                className="flex-1 w-0 px-3 py-2.5 text-left hover:bg-muted transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex-shrink-0">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-xs">💬</span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-card-foreground">
                      New comment
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {preview}
                    </p>
                  </div>
                </div>
              </button>
              <div className="flex border-l border-border">
                <button
                  onClick={() => {
                    openCommentsPanel()
                    hotToast.dismiss(t.id)
                  }}
                  className="px-3 flex items-center justify-center text-sm font-medium text-primary hover:text-primary/80 hover:bg-muted focus:outline-none transition-colors"
                >
                  View
                </button>
              </div>
            </div>
          ),
          {
            duration: 5000,
          }
        )
      }
    },
    [isCommentsPanelOpen, openCommentsPanel]
  )

  const {
    isConnected,
    error: connectionError,
    reconnect,
    isReconnecting,
  } = useRealtimeComments(studyId, {
    enabled,
    currentUserId,
    onNewComment: handleNewComment,
  })

  const markAsRead = useCallback(() => {
    setUnreadCount(0)
  }, [])

  return {
    unreadCount,
    hasUnread: unreadCount > 0,
    markAsRead,
    isPanelOpen: isCommentsPanelOpen,
    isConnected,
    connectionError,
    reconnect,
    isReconnecting,
  }
}
