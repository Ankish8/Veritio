import useSWR from 'swr'
import { useCallback, useMemo } from 'react'
import { useAuthFetch } from './use-auth-fetch'
import type { ResponseTag, ResponseTagAssignment } from '@/types/response-tags'

type ResponseType = 'first_impression' | 'flow_question' | 'questionnaire'

export function useResponseTagAssignments(
  responseIds: string[],
  responseType: ResponseType = 'first_impression'
) {
  const authFetch = useAuthFetch()

  const cacheKey = useMemo(() => {
    if (responseIds.length === 0) return null
    const sortedIds = [...responseIds].sort().join(',')
    return `/api/responses/tags/bulk-list?ids=${sortedIds}`
  }, [responseIds])

  const { data, error, isLoading, mutate } = useSWR<Record<string, ResponseTag[]>>(
    cacheKey,
    async () => {
      if (responseIds.length === 0) return {}

      const response = await authFetch('/api/responses/tags/bulk-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response_ids: responseIds }),
      })

      if (!response.ok) {
        throw new Error('Failed to fetch response tags')
      }

      return response.json()
    },
    { revalidateOnFocus: false, revalidateOnReconnect: false }
  )

  /** Assign a tag to a response */
  const assignTag = useCallback(async (
    responseId: string,
    tagId: string,
    tag: ResponseTag // Full tag object for optimistic update
  ) => {
    const response = await authFetch(`/api/responses/${responseId}/tags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tag_id: tagId, response_type: responseType }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to assign tag')
    }

    mutate(
      (current) => {
        if (!current) return { [responseId]: [tag] }
        const existingTags = current[responseId] || []
        if (existingTags.some(t => t.id === tagId)) return current
        return { ...current, [responseId]: [...existingTags, tag] }
      },
      { revalidate: false }
    )

    return response.json() as Promise<ResponseTagAssignment>
  }, [authFetch, responseType, mutate])

  /** Remove a tag from a response */
  const removeTag = useCallback(async (responseId: string, tagId: string) => {
    const response = await authFetch(`/api/responses/${responseId}/tags/${tagId}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to remove tag')
    }

    mutate(
      (current) => {
        if (!current) return current
        const existingTags = current[responseId] || []
        return { ...current, [responseId]: existingTags.filter(t => t.id !== tagId) }
      },
      { revalidate: false }
    )
  }, [authFetch, mutate])

  /** Get tags for a specific response */
  const getTagsForResponse = useCallback((responseId: string): ResponseTag[] => {
    return data?.[responseId] || []
  }, [data])

  return {
    tagsByResponse: data || {},
    getTagsForResponse,
    assignTag,
    removeTag,
    error,
    isLoading,
    mutate,
  }
}
