'use client'

import useSWR from 'swr'
import { useCallback, useState } from 'react'
import { getAuthFetchInstance } from '@/lib/swr'
import type {
  StudyTag,
  StudyTagWithCount,
  CreateStudyTagInput,
  UpdateStudyTagInput,
} from '@/types/study-tags'

export function useOrganizationStudyTags(organizationId: string | null) {
  const authFetch = getAuthFetchInstance()
  const [isDeleting, setIsDeleting] = useState(false)

  const { data, error, isLoading, mutate } = useSWR<StudyTagWithCount[]>(
    organizationId ? `/api/organizations/${organizationId}/study-tags` : null,
    async (url) => {
      const response = await authFetch(url)
      if (!response.ok) throw new Error('Failed to fetch study tags')
      return response.json()
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000, // Tags don't change often
    }
  )

  const createTag = useCallback(
    async (input: CreateStudyTagInput): Promise<StudyTag> => {
      if (!organizationId) throw new Error('Organization ID required')

      const response = await authFetch(`/api/organizations/${organizationId}/study-tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Failed to create tag')
      }

      const tag = await response.json()
      mutate()
      return tag
    },
    [authFetch, organizationId, mutate]
  )

  const updateTag = useCallback(
    async (tagId: string, input: UpdateStudyTagInput): Promise<StudyTag> => {
      const previousData = data
      mutate(
        data?.map((t) => (t.id === tagId ? { ...t, ...input } : t)),
        { revalidate: false }
      )

      try {
        const response = await authFetch(`/api/study-tags/${tagId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        })

        if (!response.ok) {
          const err = await response.json()
          throw new Error(err.error || 'Failed to update tag')
        }

        const updated = await response.json()
        mutate()
        return updated
      } catch (error) {
        mutate(previousData, { revalidate: false })
        throw error
      }
    },
    [authFetch, data, mutate]
  )

  const deleteTag = useCallback(
    async (tagId: string): Promise<void> => {
      const previousData = data
      setIsDeleting(true)
      mutate(
        data?.filter((t) => t.id !== tagId),
        { revalidate: false }
      )

      try {
        const response = await authFetch(`/api/study-tags/${tagId}`, {
          method: 'DELETE',
        })

        if (!response.ok) {
          const err = await response.json()
          throw new Error(err.error || 'Failed to delete tag')
        }
      } catch (error) {
        mutate(previousData, { revalidate: false })
        throw error
      } finally {
        setIsDeleting(false)
      }
    },
    [authFetch, data, mutate]
  )

  return {
    tags: data || [],
    isLoading,
    error,
    refetch: mutate,
    createTag,
    updateTag,
    deleteTag,
    isDeleting,
  }
}

export function useStudyTagAssignments(studyId: string | null) {
  const authFetch = getAuthFetchInstance()
  const [isUpdating, setIsUpdating] = useState(false)

  const { data, error, isLoading, mutate } = useSWR<StudyTag[]>(
    studyId ? `/api/studies/${studyId}/study-tags` : null,
    async (url) => {
      const response = await authFetch(url)
      if (!response.ok) throw new Error('Failed to fetch study tags')
      return response.json()
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 10000,
    }
  )

  const setTags = useCallback(
    async (tagIds: string[]): Promise<StudyTag[]> => {
      if (!studyId) throw new Error('Study ID required')
      setIsUpdating(true)

      try {
        const response = await authFetch(`/api/studies/${studyId}/study-tags`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tag_ids: tagIds }),
        })

        if (!response.ok) {
          const err = await response.json()
          throw new Error(err.error || 'Failed to set tags')
        }

        const tags = await response.json()
        mutate(tags, { revalidate: false })
        return tags
      } finally {
        setIsUpdating(false)
      }
    },
    [authFetch, studyId, mutate]
  )

  const addTag = useCallback(
    async (tagId: string): Promise<StudyTag[]> => {
      const currentIds = data?.map((t) => t.id) || []
      if (currentIds.includes(tagId)) return data || []
      return setTags([...currentIds, tagId])
    },
    [data, setTags]
  )

  const removeTag = useCallback(
    async (tagId: string): Promise<StudyTag[]> => {
      const currentIds = data?.map((t) => t.id) || []
      return setTags(currentIds.filter((id) => id !== tagId))
    },
    [data, setTags]
  )

  return {
    tags: data || [],
    tagIds: data?.map((t) => t.id) || [],
    isLoading,
    error,
    refetch: mutate,
    setTags,
    addTag,
    removeTag,
    isUpdating,
  }
}

export function useStudiesTagsBatch(studyIds: string[]) {
  const authFetch = getAuthFetchInstance()

  const cacheKey = studyIds.length > 0 ? `study-tags-batch:${studyIds.sort().join(',')}` : null

  const { data, error, isLoading, mutate } = useSWR<Map<string, StudyTag[]>>(
    cacheKey,
    async () => {
      // Fetch tags for each study in parallel
      const results = await Promise.all(
        studyIds.map(async (studyId) => {
          try {
            const response = await authFetch(`/api/studies/${studyId}/study-tags`)
            if (!response.ok) return { studyId, tags: [] }
            const tags = await response.json()
            return { studyId, tags }
          } catch {
            return { studyId, tags: [] }
          }
        })
      )

      const map = new Map<string, StudyTag[]>()
      for (const { studyId, tags } of results) {
        map.set(studyId, tags)
      }
      return map
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    }
  )

  const getTagsForStudy = useCallback(
    (studyId: string): StudyTag[] => {
      return data?.get(studyId) || []
    },
    [data]
  )

  return {
    getTagsForStudy,
    isLoading,
    error,
    refetch: mutate,
  }
}
