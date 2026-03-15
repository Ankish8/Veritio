'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { mutate } from 'swr'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { CommentWithAuthor } from './use-study-comments'

/** Page size must match use-study-comments.ts for correct cache key */
const PAGE_SIZE = 30

/** Reconnection settings */
const RECONNECT_BASE_DELAY = 1000 // 1 second
const RECONNECT_MAX_DELAY = 30000 // 30 seconds
const RECONNECT_MAX_ATTEMPTS = 10

/** Paginated response structure (must match use-study-comments.ts) */
interface PaginatedCommentsResponse {
  comments: CommentWithAuthor[]
  nextCursor: string | null
  prevCursor: string | null
  hasMore: boolean
  totalCount: number
}

interface StudyCommentPayload {
  id: string
  study_id: string
  author_user_id: string
  content: string
  parent_comment_id: string | null
  thread_position: number
  mentions: string[]
  is_deleted: boolean
  edited_at: string | null
  deleted_at: string | null
  deleted_by_user_id: string | null
  created_at: string
  updated_at: string
}

interface AuthorInfo {
  id: string
  name: string | null
  email: string
  image: string | null
}

interface UseRealtimeCommentsOptions {
  /** Whether to enable real-time updates (default: true) */
  enabled?: boolean
  /** Current user ID to skip self-initiated changes */
  currentUserId?: string
  /** Callback when a new comment arrives from another user */
  onNewComment?: (comment: StudyCommentPayload) => void
  /** Callback when a comment is updated by another user */
  onCommentUpdated?: () => void
  /** Callback when a comment is deleted by another user */
  onCommentDeleted?: () => void
  /** Callback when connection status changes */
  onConnectionChange?: (connected: boolean) => void
}

/** Must match fetchUrl in use-study-comments.ts exactly. */
function getCommentsCacheKey(studyId: string): string {
  return `/api/studies/${studyId}/comments?paginated=true&limit=${PAGE_SIZE}`
}

/** Real-time comment sync via Supabase Realtime with incremental cache updates. */
export function useRealtimeComments(
  studyId: string | null,
  options: UseRealtimeCommentsOptions = {}
) {
  const {
    enabled = true,
    currentUserId,
    onNewComment,
    onCommentUpdated,
    onCommentDeleted,
    onConnectionChange,
  } = options

  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reconnectAttempts, setReconnectAttempts] = useState(0)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const supabaseRef = useRef(createClient())
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isReconnectingRef = useRef(false)
  // CRITICAL: Flag to prevent reconnection during intentional cleanup
  // This fixes a race condition where removeChannel() fires CLOSED callback
  // before the cleanup finishes, triggering unwanted reconnection
  const isCleaningUpRef = useRef(false)

  const authorCacheRef = useRef<Map<string, AuthorInfo>>(new Map())

  // CRITICAL: Store callbacks in refs to prevent subscription recreation
  // This fixes the "Live/Connecting" flickering issue where callback reference
  // changes would cause the entire subscription to be torn down and recreated
  const onNewCommentRef = useRef(onNewComment)
  const onCommentUpdatedRef = useRef(onCommentUpdated)
  const onCommentDeletedRef = useRef(onCommentDeleted)
  const onConnectionChangeRef = useRef(onConnectionChange)
  const currentUserIdRef = useRef(currentUserId)

  useEffect(() => {
    onNewCommentRef.current = onNewComment
    onCommentUpdatedRef.current = onCommentUpdated
    onCommentDeletedRef.current = onCommentDeleted
    onConnectionChangeRef.current = onConnectionChange
    currentUserIdRef.current = currentUserId
  }, [onNewComment, onCommentUpdated, onCommentDeleted, onConnectionChange, currentUserId])

  const updateConnectionStatus = useCallback(
    (connected: boolean) => {
      setIsConnected(connected)
      onConnectionChangeRef.current?.(connected)
    },
    []
  )

  const fetchAuthorInfo = useCallback(
    async (userId: string): Promise<AuthorInfo> => {
      if (authorCacheRef.current.has(userId)) {
        return authorCacheRef.current.get(userId)!
      }

      const supabase = supabaseRef.current
      const { data: user } = await supabase
        .from('user')
        .select('id, name, email, image')
        .eq('id', userId)
        .single()

      const authorInfo: AuthorInfo = user
        ? { id: user.id, name: user.name, email: user.email, image: user.image }
        : { id: userId, name: null, email: '', image: null }

      authorCacheRef.current.set(userId, authorInfo)
      return authorInfo
    },
    []
  )

  const handleInsert = useCallback(
    async (payload: StudyCommentPayload) => {
      if (!studyId) return

      if (currentUserIdRef.current && payload.author_user_id === currentUserIdRef.current) {
        return
      }

      const author = await fetchAuthorInfo(payload.author_user_id)

      const newComment: CommentWithAuthor = {
        id: payload.id,
        study_id: payload.study_id,
        author_user_id: payload.author_user_id,
        content: payload.content,
        parent_comment_id: payload.parent_comment_id,
        thread_position: payload.thread_position || 0,
        mentions: payload.mentions || [],
        is_deleted: payload.is_deleted,
        deleted_at: payload.deleted_at,
        deleted_by_user_id: payload.deleted_by_user_id,
        edited_at: payload.edited_at,
        created_at: payload.created_at,
        updated_at: payload.updated_at,
        author,
      }

      const cacheKey = getCommentsCacheKey(studyId)

      mutate(
        cacheKey,
        (current: PaginatedCommentsResponse | undefined) => {
          if (!current) return current

          if (current.comments.some((c) => c.id === payload.id)) {
            return current
          }

          return {
            ...current,
            comments: [...current.comments, newComment],
            totalCount: current.totalCount + 1,
          }
        },
        { revalidate: false }
      )

      onNewCommentRef.current?.(payload)
    },
    [studyId, fetchAuthorInfo]
  )

  const handleUpdate = useCallback(
    (payload: StudyCommentPayload) => {
      if (!studyId) return

      if (currentUserIdRef.current && payload.author_user_id === currentUserIdRef.current) {
        return
      }

      const cacheKey = getCommentsCacheKey(studyId)

      mutate(
        cacheKey,
        (current: PaginatedCommentsResponse | undefined) => {
          if (!current) return current

          return {
            ...current,
            comments: current.comments.map((c) =>
              c.id === payload.id
                ? {
                    ...c,
                    content: payload.content,
                    edited_at: payload.edited_at,
                    is_deleted: payload.is_deleted,
                    deleted_at: payload.deleted_at,
                    deleted_by_user_id: payload.deleted_by_user_id,
                    updated_at: payload.updated_at,
                  }
                : c
            ),
          }
        },
        { revalidate: false }
      )

      onCommentUpdatedRef.current?.()
    },
    [studyId]
  )

  const handleDelete = useCallback(
    (oldPayload: { id: string }) => {
      if (!studyId) return

      const cacheKey = getCommentsCacheKey(studyId)

      mutate(
        cacheKey,
        (current: PaginatedCommentsResponse | undefined) => {
          if (!current) return current

          return {
            ...current,
            comments: current.comments.filter((c) => c.id !== oldPayload.id),
            totalCount: Math.max(0, current.totalCount - 1),
          }
        },
        { revalidate: false }
      )

      onCommentDeletedRef.current?.()
    },
    [studyId]
  )

  const invalidateComments = useCallback(() => {
    if (studyId) {
      const cacheKey = getCommentsCacheKey(studyId)
      mutate(cacheKey)
    }
  }, [studyId])

  const subscribe = useCallback(() => {
    if (!studyId) return null

    const supabase = supabaseRef.current
    const channelName = `study-comments:${studyId}`

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'study_comments',
          filter: `study_id=eq.${studyId}`,
        },
        (payload) => {
          handleInsert(payload.new as StudyCommentPayload)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'study_comments',
          filter: `study_id=eq.${studyId}`,
        },
        (payload) => {
          handleUpdate(payload.new as StudyCommentPayload)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'study_comments',
          filter: `study_id=eq.${studyId}`,
        },
        (payload) => {
          handleDelete(payload.old as { id: string })
        }
      )
      .subscribe((status) => {
        // CRITICAL: Ignore status changes during intentional cleanup
        // This prevents the race condition where cleanup triggers CLOSED
        // which then tries to reconnect while we're unmounting
        if (isCleaningUpRef.current) {
          return
        }

        if (status === 'SUBSCRIBED') {
          updateConnectionStatus(true)
          setError(null)
          setReconnectAttempts(0)
          isReconnectingRef.current = false
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          updateConnectionStatus(false)
          setError(
            status === 'TIMED_OUT'
              ? 'Connection timed out'
              : 'Lost connection to real-time updates'
          )
          // Trigger reconnection only if not cleaning up
          if (!isCleaningUpRef.current) {
            scheduleReconnect()
          }
        } else if (status === 'CLOSED') {
          updateConnectionStatus(false)
          // Only reconnect if not intentionally closed and not cleaning up
          if (!isReconnectingRef.current && !isCleaningUpRef.current) {
            scheduleReconnect()
          }
        }
      })

    return channel
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studyId, handleInsert, handleUpdate, handleDelete, updateConnectionStatus])

  const scheduleReconnect = useCallback(() => {
    // Don't reconnect if already reconnecting, cleaning up, or max attempts reached
    if (isReconnectingRef.current || isCleaningUpRef.current || reconnectAttempts >= RECONNECT_MAX_ATTEMPTS) {
      if (reconnectAttempts >= RECONNECT_MAX_ATTEMPTS) {
        setError(`Connection failed after ${RECONNECT_MAX_ATTEMPTS} attempts. Please refresh the page.`)
      }
      return
    }

    isReconnectingRef.current = true

    const delay = Math.min(
      RECONNECT_BASE_DELAY * Math.pow(2, reconnectAttempts),
      RECONNECT_MAX_DELAY
    )

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }

    reconnectTimeoutRef.current = setTimeout(() => {
      // Double-check we're not cleaning up (could have changed during delay)
      if (isCleaningUpRef.current) {
        isReconnectingRef.current = false
        return
      }

      setReconnectAttempts((prev) => prev + 1)

      isCleaningUpRef.current = true

      if (channelRef.current) {
        supabaseRef.current.removeChannel(channelRef.current)
        channelRef.current = null
      }

      isCleaningUpRef.current = false

      const newChannel = subscribe()
      if (newChannel) {
        channelRef.current = newChannel
      }
    }, delay)
  }, [reconnectAttempts, subscribe])

  useEffect(() => {
    if (!enabled || !studyId) return

    const supabase = supabaseRef.current
    isCleaningUpRef.current = false

    const channel = subscribe()
    if (channel) {
      channelRef.current = channel
    }

    return () => {
      // CRITICAL: Set cleanup flag BEFORE any cleanup operations
      // This prevents the CLOSED callback from triggering reconnection
      isCleaningUpRef.current = true

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }

      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }

      updateConnectionStatus(false)
      setReconnectAttempts(0)
      isReconnectingRef.current = false
    }
  }, [studyId, enabled, subscribe, updateConnectionStatus])

  const reconnect = useCallback(() => {
    setReconnectAttempts(0)
    setError(null)
    isReconnectingRef.current = false

    isCleaningUpRef.current = true

    if (channelRef.current) {
      supabaseRef.current.removeChannel(channelRef.current)
      channelRef.current = null
    }

    isCleaningUpRef.current = false

    const channel = subscribe()
    if (channel) {
      channelRef.current = channel
    }
  }, [subscribe])

  return {
    isConnected,
    error,
    reconnectAttempts,
    isReconnecting: isReconnectingRef.current && reconnectAttempts > 0,
    refresh: invalidateComments,
    reconnect,
  }
}
