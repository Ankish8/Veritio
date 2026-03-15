'use client'

import useSWR from 'swr'
import { useCallback } from 'react'
import { getAuthFetchInstance } from '@/lib/swr/fetcher'
import { useSession } from '@veritio/auth/client'
import type { Comment } from '@/components/analysis/recordings/comments-tab'

/** Shape returned by the API (DB columns + enriched author info) */
interface ApiComment {
  id: string
  recording_id: string
  clip_id: string | null
  timestamp_ms: number | null
  content: string
  created_by: string
  author_name: string | null
  author_email: string | null
  author_image: string | null
  created_at: string
  updated_at: string
}

/** Map API comment to UI Comment shape */
function toComment(c: ApiComment): Comment {
  return {
    id: c.id,
    recording_id: c.recording_id,
    clip_id: c.clip_id ?? null,
    timestamp_ms: c.timestamp_ms,
    content: c.content,
    author_id: c.created_by,
    author_name: c.author_name,
    author_email: c.author_email,
    author_image: c.author_image ?? null,
    created_at: c.created_at,
    updated_at: c.updated_at,
  }
}

interface UseRecordingCommentsReturn {
  comments: Comment[]
  isLoading: boolean
  error: Error | null
  mutate: () => void
  createComment: (data: { content: string; timestampMs?: number }) => Promise<Comment>
  updateComment: (id: string, content: string) => Promise<Comment>
  deleteComment: (id: string) => Promise<void>
}

export function useRecordingComments(
  studyId: string,
  recordingId: string
): UseRecordingCommentsReturn {
  const { data: session } = useSession()
  const { data, error, isLoading, mutate } = useSWR<{ data: ApiComment[] }>(
    studyId && recordingId
      ? `/api/studies/${studyId}/recordings/${recordingId}/comments`
      : null
  )

  const createComment = useCallback(
    async (commentData: { content: string; timestampMs?: number }): Promise<Comment> => {
      const timestampMs = commentData.timestampMs != null ? Math.round(commentData.timestampMs) : null

      // Build optimistic comment for immediate UI update
      const optimisticComment: ApiComment = {
        id: `temp-${Date.now()}`,
        recording_id: recordingId,
        clip_id: null,
        timestamp_ms: timestampMs,
        content: commentData.content,
        created_by: session?.user?.id || '',
        author_name: session?.user?.name || null,
        author_email: session?.user?.email || null,
        author_image: session?.user?.image || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      // Optimistically add to cache immediately
      mutate(
        (current) => {
          const existing = current?.data || []
          return { data: [...existing, optimisticComment] }
        },
        { revalidate: false }
      )

      const authFetch = getAuthFetchInstance()
      const response = await authFetch(
        `/api/studies/${studyId}/recordings/${recordingId}/comments`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: commentData.content,
            timestamp_ms: timestampMs,
          }),
        }
      )

      if (!response.ok) {
        // Rollback optimistic update on failure
        mutate()
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create comment')
      }

      const result = await response.json()

      // Replace optimistic comment with real one from server
      mutate(
        (current) => {
          const existing = current?.data || []
          return { data: existing.map(c => c.id === optimisticComment.id ? result.data : c) }
        },
        { revalidate: false }
      )

      return toComment(result.data)
    },
    [studyId, recordingId, mutate, session?.user?.id, session?.user?.name, session?.user?.email, session?.user?.image]
  )

  const updateComment = useCallback(
    async (id: string, content: string): Promise<Comment> => {
      const authFetch = getAuthFetchInstance()
      const response = await authFetch(
        `/api/studies/${studyId}/recordings/${recordingId}/comments/${id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content }),
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update comment')
      }

      const result = await response.json()
      // Update cache with server response instead of full revalidation
      mutate(
        (current) => {
          const existing = current?.data || []
          return { data: existing.map(c => c.id === id ? result.data : c) }
        },
        { revalidate: false }
      )
      return toComment(result.data)
    },
    [studyId, recordingId, mutate]
  )

  const deleteComment = useCallback(
    async (id: string): Promise<void> => {
      // Optimistic update: immediately remove from cache
      await mutate(
        (current) => {
          const existing = current?.data || []
          return { data: existing.filter((c) => c.id !== id) }
        },
        { revalidate: false }
      )

      const authFetch = getAuthFetchInstance()
      const response = await authFetch(
        `/api/studies/${studyId}/recordings/${recordingId}/comments/${id}`,
        {
          method: 'DELETE',
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        // Revalidate to restore if delete failed
        mutate()
        throw new Error(errorData.error || 'Failed to delete comment')
      }
    },
    [studyId, recordingId, mutate]
  )

  return {
    comments: (data?.data || []).map(toComment),
    isLoading,
    error: error || null,
    mutate,
    createComment,
    updateComment,
    deleteComment,
  }
}
