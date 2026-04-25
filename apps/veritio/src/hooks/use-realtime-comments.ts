'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { mutate } from 'swr'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { CommentWithAuthor } from './use-study-comments'

/** Page size must match use-study-comments.ts for correct cache key */
const PAGE_SIZE = 30

/** Reconnection settings */
const RECONNECT_BASE_DELAY = 1000
const RECONNECT_MAX_DELAY = 30000
const RECONNECT_MAX_ATTEMPTS = 10

interface PaginatedCommentsResponse {
  comments: CommentWithAuthor[]
  nextCursor: string | null
  prevCursor: string | null
  hasMore: boolean
  totalCount: number
}

interface AuthorInfo {
  id: string
  name: string | null
  email: string
  image: string | null
}

interface CommentBroadcastInsertPayload {
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
  author: AuthorInfo | null
}

interface CommentBroadcastDeletePayload {
  id: string
  study_id: string
}

interface UseRealtimeCommentsOptions {
  enabled?: boolean
  currentUserId?: string
  onNewComment?: (comment: CommentBroadcastInsertPayload) => void
  onCommentUpdated?: () => void
  onCommentDeleted?: () => void
  onConnectionChange?: (connected: boolean) => void
}

function getCommentsCacheKey(studyId: string): string {
  return `/api/studies/${studyId}/comments?paginated=true&limit=${PAGE_SIZE}`
}

/**
 * Real-time comment sync via Supabase Realtime broadcast channels.
 * Server-side: a Postgres trigger on `study_comments` calls realtime.send()
 * with the comment row + author info embedded (joined from `user` table).
 */
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
  const isCleaningUpRef = useRef(false)

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

  const updateConnectionStatus = useCallback((connected: boolean) => {
    setIsConnected(connected)
    onConnectionChangeRef.current?.(connected)
  }, [])

  const handleInsert = useCallback(
    (payload: CommentBroadcastInsertPayload) => {
      if (!studyId) return

      if (currentUserIdRef.current && payload.author_user_id === currentUserIdRef.current) {
        return
      }

      const author: AuthorInfo = payload.author ?? {
        id: payload.author_user_id,
        name: null,
        email: '',
        image: null,
      }

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
          if (current.comments.some((c) => c.id === payload.id)) return current
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
    [studyId]
  )

  const handleUpdate = useCallback(
    (payload: CommentBroadcastInsertPayload) => {
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
    (payload: CommentBroadcastDeletePayload) => {
      if (!studyId) return

      const cacheKey = getCommentsCacheKey(studyId)

      mutate(
        cacheKey,
        (current: PaginatedCommentsResponse | undefined) => {
          if (!current) return current
          return {
            ...current,
            comments: current.comments.filter((c) => c.id !== payload.id),
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
      .on('broadcast', { event: 'INSERT' }, ({ payload }) => {
        handleInsert(payload as CommentBroadcastInsertPayload)
      })
      .on('broadcast', { event: 'UPDATE' }, ({ payload }) => {
        handleUpdate(payload as CommentBroadcastInsertPayload)
      })
      .on('broadcast', { event: 'DELETE' }, ({ payload }) => {
        handleDelete(payload as CommentBroadcastDeletePayload)
      })
      .subscribe((status) => {
        if (isCleaningUpRef.current) return

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
          if (!isCleaningUpRef.current) {
            scheduleReconnect()
          }
        } else if (status === 'CLOSED') {
          updateConnectionStatus(false)
          if (!isReconnectingRef.current && !isCleaningUpRef.current) {
            scheduleReconnect()
          }
        }
      })

    return channel
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studyId, handleInsert, handleUpdate, handleDelete, updateConnectionStatus])

  const scheduleReconnect = useCallback(() => {
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
