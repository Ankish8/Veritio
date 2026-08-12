'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { mutate } from 'swr'
import { getAuthFetchInstance } from '@/lib/swr'
import { subscribeToStream, unwrapStreamEvent } from './use-iii-stream'
import type { CommentWithAuthor } from './use-study-comments'

/** Page size must match use-study-comments.ts for correct cache key */
const PAGE_SIZE = 30

/**
 * Safety-net poll. With the change signal connected this should rarely be the
 * thing that notices an update, so it's deliberately slow — it exists to
 * converge when the stream is unavailable, not to drive the UI.
 */
const POLL_INTERVAL_MS = 60000

/** Backoff after a failed poll, so a flaky network doesn't hammer the API. */
const POLL_ERROR_BACKOFF_MS = 30000

interface CommentChangeSignal {
  key: string
  kind: 'created' | 'updated' | 'deleted'
  actorUserId?: string
  changedAt: string
}

interface PaginatedCommentsResponse {
  comments: CommentWithAuthor[]
  nextCursor: string | null
  prevCursor: string | null
  hasMore: boolean
  totalCount: number
  /** Capability key for the change-signal stream; issued by the authed endpoint. */
  streamKey?: string | null
}

interface UseRealtimeCommentsOptions {
  enabled?: boolean
  currentUserId?: string
  onNewComment?: (comment: CommentWithAuthor) => void
  onCommentUpdated?: () => void
  onCommentDeleted?: () => void
  onConnectionChange?: (connected: boolean) => void
}

function getCommentsCacheKey(studyId: string): string {
  return `/api/studies/${studyId}/comments?paginated=true&limit=${PAGE_SIZE}`
}

/**
 * Keeps the study comment panel in sync with the server.
 *
 * This used to ride a Supabase Realtime broadcast channel, but that channel was
 * published with `private => false`, so anyone with the public anon key and a
 * study UUID could stream comment bodies plus author names and emails. The
 * usual fix — flip the channel private and gate `realtime.messages` with RLS —
 * is not available: the browser Supabase client is anon-key-only because the app
 * authenticates with Better Auth, so `auth.uid()` is always NULL and every
 * subscription would fail. The publishing trigger is dropped in
 * 20260812000000_drop_public_comment_broadcast.sql.
 *
 * What replaced it is deliberately NOT "the same thing on the iii stream". A
 * probe against iii 0.22.x showed a stream's onJoin CANNOT veto a subscription
 * (it only logs), and the RBAC listener admits tokenless connections, so
 * publishing comment bodies there would have rebuilt the same hole one layer
 * over. Instead:
 *
 *   1. The stream carries a CONTENT-FREE tick — "study X changed at T". No
 *      bodies, no names, no emails.
 *   2. Its group id is an unguessable capability key handed out only by the
 *      authenticated list endpoint, after it has checked study access.
 *   3. The tick just triggers a re-fetch over that same authenticated endpoint,
 *      which is where authorization actually lives.
 *
 * A slow poll stays underneath as a safety net for when the stream is down.
 * The public API is unchanged from the Supabase-broadcast version.
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
  const [isReconnecting, setIsReconnecting] = useState(false)

  const authFetch = getAuthFetchInstance()

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

  /** Ids seen on a previous poll — the baseline for "what's new". */
  const seenIdsRef = useRef<Set<string> | null>(null)
  /** Guards against overlapping polls when one runs long. */
  const inFlightRef = useRef(false)
  /** Capability key learned from the last successful fetch. */
  const streamKeyRef = useRef<string | null>(null)
  const [streamKey, setStreamKey] = useState<string | null>(null)

  const updateConnectionStatus = useCallback((connected: boolean) => {
    setIsConnected(connected)
    onConnectionChangeRef.current?.(connected)
  }, [])

  const poll = useCallback(async (): Promise<boolean> => {
    if (!studyId || inFlightRef.current) return false
    inFlightRef.current = true

    try {
      const cacheKey = getCommentsCacheKey(studyId)
      const response = await authFetch(cacheKey)
      if (!response.ok) throw new Error('Failed to sync comments')

      const fresh: PaginatedCommentsResponse = await response.json()
      const freshComments = fresh.comments ?? []

      // Learn the capability key once; it's stable per study.
      if (fresh.streamKey && streamKeyRef.current !== fresh.streamKey) {
        streamKeyRef.current = fresh.streamKey
        setStreamKey(fresh.streamKey)
      }

      // First successful poll only establishes the baseline — every existing
      // comment would otherwise be announced as new.
      const previouslySeen = seenIdsRef.current
      const freshIds = new Set(freshComments.map((c) => c.id))

      if (previouslySeen) {
        let added = false
        for (const comment of freshComments) {
          if (previouslySeen.has(comment.id)) continue
          added = true
          // Own comments already appeared via the optimistic write.
          if (currentUserIdRef.current && comment.author_user_id === currentUserIdRef.current) continue
          onNewCommentRef.current?.(comment)
        }

        let removed = false
        for (const id of previouslySeen) {
          if (!freshIds.has(id)) {
            removed = true
            break
          }
        }
        if (removed) onCommentDeletedRef.current?.()
        // Only signal a change when the set actually moved — firing on every
        // tick would make this callback meaningless to subscribers.
        if (added || removed) onCommentUpdatedRef.current?.()
      }

      seenIdsRef.current = freshIds

      // Merge rather than overwrite: optimistic sends that haven't been
      // confirmed (including failed ones awaiting retry) exist only on the
      // client, and blowing them away would strand the retry UI.
      mutate(
        cacheKey,
        (current: PaginatedCommentsResponse | undefined) => {
          if (!current) return fresh
          const pendingOnly = current.comments.filter((c) => c._tempId && !freshIds.has(c.id))
          return { ...fresh, comments: [...freshComments, ...pendingOnly] }
        },
        { revalidate: false }
      )

      setError(null)
      updateConnectionStatus(true)
      return true
    } catch {
      setError('Lost connection to comment updates')
      updateConnectionStatus(false)
      return false
    } finally {
      inFlightRef.current = false
    }
  }, [studyId, authFetch, updateConnectionStatus])

  const reconnect = useCallback(async () => {
    setIsReconnecting(true)
    try {
      await poll()
    } finally {
      setIsReconnecting(false)
    }
  }, [poll])

  useEffect(() => {
    if (!studyId || !enabled) {
      updateConnectionStatus(false)
      return
    }

    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null

    const scheduleNext = (delay: number) => {
      if (cancelled) return
      timer = setTimeout(run, delay)
    }

    const run = async () => {
      if (cancelled) return
      // Don't poll a backgrounded tab; the visibility listener catches up.
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        scheduleNext(POLL_INTERVAL_MS)
        return
      }
      const ok = await poll()
      scheduleNext(ok ? POLL_INTERVAL_MS : POLL_ERROR_BACKOFF_MS)
    }

    run()

    const onFocus = () => {
      if (document.visibilityState === 'visible') void poll()
    }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)

    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
      seenIdsRef.current = null
    }
  }, [studyId, enabled, poll, updateConnectionStatus])

  // Change-signal subscription. The tick carries nothing usable on its own —
  // it just says "re-fetch now", which is why it's safe to receive over a
  // channel the stream layer cannot authorize.
  useEffect(() => {
    if (!studyId || !enabled || !streamKey) return

    const unsubscribe = subscribeToStream('studyComments', streamKey, {
      onStatus: (state) => {
        if (state === 'connected') {
          setError(null)
          updateConnectionStatus(true)
        } else if (state === 'failed') {
          // Not surfaced as an error: the poll below still converges, so the
          // panel is degraded rather than broken.
          updateConnectionStatus(false)
        }
      },
      onEvent: (change) => {
        const signal = unwrapStreamEvent<CommentChangeSignal>(change)
        if (!signal || signal.key !== streamKey) return
        // Our own writes already applied optimistically.
        if (signal.actorUserId && signal.actorUserId === currentUserIdRef.current) return
        void poll()
      },
    })

    return unsubscribe
  }, [studyId, enabled, streamKey, poll, updateConnectionStatus])

  return {
    isConnected,
    error,
    reconnect,
    isReconnecting,
  }
}
