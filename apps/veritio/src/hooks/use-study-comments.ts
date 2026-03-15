'use client'

import useSWR from 'swr'
import { useCallback, useMemo, useRef, useState } from 'react'
import { getAuthFetchInstance } from '@/lib/swr'
import { useSession } from '@veritio/auth/client'
import { createTempItem } from '@/lib/swr/crud-factory/optimistic-helpers'
import type { StudyComment } from '@/lib/supabase/collaboration-types'

/** Number of comments to load per page (smaller = faster initial load) */
const PAGE_SIZE = 30

/** Maximum retry attempts for failed messages */
const MAX_RETRY_ATTEMPTS = 3

/** Delivery status for optimistic updates */
export type DeliveryStatus = 'pending' | 'sent' | 'failed'

/** Failed message stored for retry */
export interface FailedMessage {
  tempId: string
  content: string
  parentCommentId?: string
  error: string
  retryCount: number
  lastAttempt: number
}

export interface CommentWithAuthor extends StudyComment {
  author?: {
    id: string
    name: string | null
    email: string
    image?: string | null
  }
  /** Delivery status for optimistic updates */
  _deliveryStatus?: DeliveryStatus
  /** Temporary ID for tracking optimistic comments */
  _tempId?: string
}

export interface CommentThread {
  parent: CommentWithAuthor
  replies: CommentWithAuthor[]
}

/** API response for paginated comments */
interface PaginatedCommentsResponse {
  comments: CommentWithAuthor[]
  nextCursor: string | null
  prevCursor: string | null
  hasMore: boolean
  totalCount: number
}

/** Extract @mention user IDs from content */
function extractMentions(content: string): string[] {
  const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g
  const mentions: string[] = []
  let match: RegExpExecArray | null
  while ((match = mentionRegex.exec(content)) !== null) {
    mentions.push(match[2])
  }
  return mentions
}

export function useStudyComments(studyId: string | null) {
  const authFetch = getAuthFetchInstance()

  const { data: session } = useSession()
  const currentUser = session?.user

  const [additionalComments, setAdditionalComments] = useState<CommentWithAuthor[]>([])
  const [paginationState, setPaginationState] = useState<{
    hasMore: boolean
    totalCount: number
    nextCursor: string | null
  }>({ hasMore: false, totalCount: 0, nextCursor: null })
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  const [failedMessages, setFailedMessages] = useState<FailedMessage[]>([])
  const pendingRetries = useRef<Set<string>>(new Set())

  const fetchUrl = studyId
    ? `/api/studies/${studyId}/comments?paginated=true&limit=${PAGE_SIZE}`
    : null

  const { data: initialData, error, isLoading, mutate: revalidate } = useSWR<PaginatedCommentsResponse>(
    fetchUrl,
    async (url) => {
      const response = await authFetch(url)
      if (!response.ok) {
        throw new Error('Failed to fetch comments')
      }
      return response.json()
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 30000, // 30s deduping
      keepPreviousData: true, // Show cached data while revalidating
      onSuccess: (result) => {
        setPaginationState({
          hasMore: result.hasMore,
          totalCount: result.totalCount,
          nextCursor: result.nextCursor,
        })
        setAdditionalComments([])
      },
    }
  )

  const allComments = useMemo(() => {
    const initial = initialData?.comments || []
    const combined = [...additionalComments, ...initial]
    const seen = new Set<string>()
    return combined.filter((comment) => {
      if (seen.has(comment.id)) return false
      seen.add(comment.id)
      return true
    })
  }, [initialData?.comments, additionalComments])

  const hasMore = paginationState.hasMore || (initialData?.hasMore ?? false)
  const totalCount = paginationState.totalCount || (initialData?.totalCount ?? 0)

  const loadMore = useCallback(async () => {
    const cursor = paginationState.nextCursor || initialData?.nextCursor
    if (!studyId || !hasMore || isLoadingMore || !cursor) return

    setIsLoadingMore(true)
    try {
      const url = `/api/studies/${studyId}/comments?paginated=true&limit=${PAGE_SIZE}&before=${encodeURIComponent(cursor)}`
      const response = await authFetch(url)

      if (!response.ok) {
        throw new Error('Failed to load more comments')
      }

      const result: PaginatedCommentsResponse = await response.json()

      setAdditionalComments((prev) => [...result.comments, ...prev])
      setPaginationState({
        hasMore: result.hasMore,
        totalCount: result.totalCount,
        nextCursor: result.nextCursor,
      })
    } catch {
      // Load more failed silently
    } finally {
      setIsLoadingMore(false)
    }
  }, [studyId, hasMore, isLoadingMore, authFetch, paginationState.nextCursor, initialData?.nextCursor])

  const updateDeliveryStatus = useCallback(
    (tempId: string, status: DeliveryStatus) => {
      revalidate(
        (current) => {
          if (!current) return current
          return {
            ...current,
            comments: current.comments.map((c) =>
              c._tempId === tempId || c.id === tempId
                ? { ...c, _deliveryStatus: status }
                : c
            ),
          }
        },
        { revalidate: false }
      )
    },
    [revalidate]
  )

  const createComment = useCallback(
    async (
      content: string,
      parentCommentId?: string,
      retryTempId?: string // Used when retrying a failed message
    ): Promise<StudyComment> => {
      if (!studyId) throw new Error('Study ID required')
      if (!currentUser) throw new Error('Must be logged in')

      // For retries, update existing message status to pending
      const tempId = retryTempId || `temp_${Date.now()}_${Math.random().toString(36).slice(2)}`

      if (retryTempId) {
        updateDeliveryStatus(retryTempId, 'pending')
        setFailedMessages((prev) => prev.filter((m) => m.tempId !== retryTempId))
      } else {
        const tempComment = createTempItem<CommentWithAuthor>({
          study_id: studyId,
          author_user_id: currentUser.id,
          content,
          parent_comment_id: parentCommentId || null,
          thread_position: 0,
          mentions: extractMentions(content),
          is_deleted: false,
          deleted_at: null,
          deleted_by_user_id: null,
          edited_at: null,
          author: {
            id: currentUser.id,
            name: currentUser.name || null,
            email: currentUser.email || '',
            image: currentUser.image || null,
          },
        })

        const trackedComment: CommentWithAuthor = {
          ...tempComment,
          _deliveryStatus: 'pending',
          _tempId: tempId,
        }

        revalidate(
          (current) => {
            if (!current) return current
            return {
              ...current,
              comments: [...current.comments, trackedComment],
              totalCount: current.totalCount + 1,
            }
          },
          { revalidate: false }
        )
      }

      try {
        const response = await authFetch(`/api/studies/${studyId}/comments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content,
            parent_comment_id: parentCommentId,
          }),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Failed to create comment')
        }

        const created = await response.json()

        revalidate(
          (current) => {
            if (!current) return current
            return {
              ...current,
              comments: current.comments.map((c) =>
                c._tempId === tempId || c.id === tempId
                  ? {
                      ...created,
                      author: c.author,
                      _deliveryStatus: 'sent' as DeliveryStatus,
                      _tempId: undefined,
                    }
                  : c
              ),
            }
          },
          { revalidate: false }
        )

        return created
      } catch (error) {
        updateDeliveryStatus(tempId, 'failed')
        const errorMessage = error instanceof Error ? error.message : 'Failed to send'
        setFailedMessages((prev) => {
          const existing = prev.find((m) => m.tempId === tempId)
          if (existing) {
            return prev.map((m) =>
              m.tempId === tempId
                ? { ...m, retryCount: m.retryCount + 1, lastAttempt: Date.now(), error: errorMessage }
                : m
            )
          }
          return [
            ...prev,
            {
              tempId,
              content,
              parentCommentId,
              error: errorMessage,
              retryCount: 0,
              lastAttempt: Date.now(),
            },
          ]
        })

        throw error
      }
    },
    [authFetch, studyId, currentUser, revalidate, updateDeliveryStatus]
  )

  const retryFailedMessage = useCallback(
    async (tempId: string): Promise<void> => {
      if (pendingRetries.current.has(tempId)) return
      pendingRetries.current.add(tempId)

      const failedMessage = failedMessages.find((m) => m.tempId === tempId)
      if (!failedMessage) {
        pendingRetries.current.delete(tempId)
        return
      }

      if (failedMessage.retryCount >= MAX_RETRY_ATTEMPTS) {
        pendingRetries.current.delete(tempId)
        throw new Error(`Maximum retry attempts (${MAX_RETRY_ATTEMPTS}) exceeded`)
      }

      try {
        await createComment(failedMessage.content, failedMessage.parentCommentId, tempId)
      } finally {
        pendingRetries.current.delete(tempId)
      }
    },
    [failedMessages, createComment]
  )

  const dismissFailedMessage = useCallback(
    (tempId: string) => {
      revalidate(
        (current) => {
          if (!current) return current
          return {
            ...current,
            comments: current.comments.filter((c) => c._tempId !== tempId),
            totalCount: current.totalCount - 1,
          }
        },
        { revalidate: false }
      )
      setFailedMessages((prev) => prev.filter((m) => m.tempId !== tempId))
    },
    [revalidate]
  )

  const updateComment = useCallback(
    async (commentId: string, content: string): Promise<void> => {
      if (!studyId) throw new Error('Study ID required')

      let originalComment: CommentWithAuthor | undefined
      revalidate(
        (current) => {
          if (!current) return current
          originalComment = current.comments.find((c) => c.id === commentId)
          return {
            ...current,
            comments: current.comments.map((c) =>
              c.id === commentId
                ? {
                    ...c,
                    content,
                    edited_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  }
                : c
            ),
          }
        },
        { revalidate: false }
      )

      try {
        const response = await authFetch(
          `/api/studies/${studyId}/comments/${commentId}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content }),
          }
        )

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Failed to update comment')
        }
      } catch (error) {
        if (originalComment) {
          revalidate(
            (current) => {
              if (!current) return current
              return {
                ...current,
                comments: current.comments.map((c) =>
                  c.id === commentId
                    ? {
                        ...c,
                        content: originalComment!.content,
                        edited_at: originalComment!.edited_at,
                        updated_at: originalComment!.updated_at,
                      }
                    : c
                ),
              }
            },
            { revalidate: false }
          )
        }
        throw error
      }
    },
    [authFetch, studyId, revalidate]
  )

  const deleteComment = useCallback(
    async (commentId: string): Promise<void> => {
      if (!studyId) throw new Error('Study ID required')

      let deletedComment: CommentWithAuthor | undefined
      revalidate(
        (current) => {
          if (!current) return current
          deletedComment = current.comments.find((c) => c.id === commentId)
          return {
            ...current,
            comments: current.comments.map((c) =>
              c.id === commentId
                ? { ...c, is_deleted: true, deleted_at: new Date().toISOString() }
                : c
            ),
          }
        },
        { revalidate: false }
      )

      try {
        const response = await authFetch(
          `/api/studies/${studyId}/comments/${commentId}`,
          {
            method: 'DELETE',
          }
        )

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Failed to delete comment')
        }
      } catch (error) {
        if (deletedComment) {
          revalidate(
            (current) => {
              if (!current) return current
              return {
                ...current,
                comments: current.comments.map((c) =>
                  c.id === commentId
                    ? { ...c, is_deleted: false, deleted_at: null }
                    : c
                ),
              }
            },
            { revalidate: false }
          )
        }
        throw error
      }
    },
    [authFetch, studyId, revalidate]
  )

  const threads = useMemo((): CommentThread[] => {
    if (!allComments.length) return []
    const visibleComments = allComments.filter((c) => !c.is_deleted)
    const topLevel = visibleComments.filter((c) => !c.parent_comment_id)
    return topLevel.map((parent) => ({
      parent,
      replies: visibleComments
        .filter((c) => c.parent_comment_id === parent.id)
        .sort((a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        ),
    }))
  }, [allComments])

  return {
    comments: allComments.filter((c) => !c.is_deleted),
    threads,
    isLoading,
    error,
    hasMore,
    isLoadingMore,
    totalCount,
    loadMore,
    refetch: revalidate,
    createComment,
    updateComment,
    deleteComment,
    extractMentions,
    failedMessages,
    retryFailedMessage,
    dismissFailedMessage,
  }
}
