/**
 * useStudyTags Hook
 *
 * SWR-based hook for managing tags at the study level.
 */

import useSWR from 'swr'
import { useCallback } from 'react'
import { useAuthFetch } from './use-auth-fetch'
import type {
  ResponseTag,
  ResponseTagWithCount,
  CreateTagInput,
  UpdateTagInput,
} from '@/types/response-tags'

/**
 * Hook for managing tags for a study (CRUD operations)
 */
export function useStudyTags(studyId: string | null) {
  const authFetch = useAuthFetch()

  const { data, error, isLoading, mutate } = useSWR<ResponseTagWithCount[]>(
    studyId ? `/api/studies/${studyId}/tags` : null
  )

  const createTag = useCallback(async (input: CreateTagInput) => {
    if (!studyId) throw new Error('Study ID is required')

    const response = await authFetch(`/api/studies/${studyId}/tags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to create tag')
    }

    const newTag = await response.json()
    mutate((tags) => [...(tags || []), { ...newTag, assignment_count: 0 }], { revalidate: false })
    return newTag as ResponseTag
  }, [studyId, authFetch, mutate])

  const updateTag = useCallback(async (tagId: string, input: UpdateTagInput) => {
    if (!studyId) throw new Error('Study ID is required')

    const response = await authFetch(`/api/studies/${studyId}/tags/${tagId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to update tag')
    }

    const updatedTag = await response.json()
    mutate((tags) => tags?.map(t => t.id === tagId ? { ...t, ...updatedTag } : t), { revalidate: false })
    return updatedTag as ResponseTag
  }, [studyId, authFetch, mutate])

  const deleteTag = useCallback(async (tagId: string) => {
    if (!studyId) throw new Error('Study ID is required')

    const response = await authFetch(`/api/studies/${studyId}/tags/${tagId}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to delete tag')
    }

    mutate((tags) => tags?.filter(t => t.id !== tagId), { revalidate: false })
  }, [studyId, authFetch, mutate])

  return {
    tags: data || [],
    error,
    isLoading,
    mutate,
    createTag,
    updateTag,
    deleteTag,
  }
}
