import useSWR from 'swr'
import { useCallback } from 'react'
import { useAuthFetch } from '../use-auth-fetch'
import { useCurrentOrganizationId } from '@/stores/collaboration-store'
import type { PanelTag, PanelTagInsert, PanelTagUpdate, TagAssignmentSource } from '@/lib/supabase/panel-types'
import type { PanelTagWithCount } from '@/services/panel'

/** Manages panel tags with CRUD operations. */
export function usePanelTags(overrideOrganizationId?: string) {
  const authFetch = useAuthFetch()
  const storeOrganizationId = useCurrentOrganizationId()
  const organizationId = overrideOrganizationId || storeOrganizationId

  const { data, error, isLoading, mutate } = useSWR<PanelTagWithCount[]>(
    organizationId ? `/api/panel/tags?organizationId=${organizationId}` : null,
    null,
    {
      // Prevent duplicate fetches when multiple components use usePanelTags (e.g. list page + tag assignments)
      dedupingInterval: 5000,
      ...(overrideOrganizationId ? { revalidateOnMount: false } : {}),
    }
  )

  const createTag = useCallback(async (input: PanelTagInsert) => {
    const response = await authFetch(`/api/panel/tags?organizationId=${organizationId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to create tag')
    }

    const newTag = await response.json()
    mutate((tags) => [...(tags || []), { ...newTag, participant_count: 0 }], { revalidate: false })
    return newTag as PanelTag
  }, [authFetch, mutate, organizationId])

  const updateTag = useCallback(async (tagId: string, input: PanelTagUpdate) => {
    const response = await authFetch(`/api/panel/tags/${tagId}?organizationId=${organizationId}`, {
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
    return updatedTag as PanelTag
  }, [authFetch, mutate, organizationId])

  const deleteTag = useCallback(async (tagId: string) => {
    const response = await authFetch(`/api/panel/tags/${tagId}?organizationId=${organizationId}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to delete tag')
    }

    mutate((tags) => tags?.filter(t => t.id !== tagId), { revalidate: false })
  }, [authFetch, mutate, organizationId])

  return {
    tags: data || [],
    isLoading,
    error,
    mutate,
    createTag,
    updateTag,
    deleteTag,
  }
}

/** Manages tag assignments for a participant. */
export function usePanelTagAssignments(participantId: string | null) {
  const authFetch = useAuthFetch()
  const organizationId = useCurrentOrganizationId()
  const { tags, mutate: mutateTags } = usePanelTags()

  const assignTag = useCallback(async (tagId: string, source: TagAssignmentSource = 'manual') => {
    if (!participantId) throw new Error('Participant ID is required')

    const response = await authFetch(`/api/panel/participants/${participantId}/tags?organizationId=${organizationId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ panel_tag_id: tagId, source }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to assign tag')
    }

    mutateTags() // Revalidate to update counts
    return response.json()
  }, [participantId, authFetch, mutateTags, organizationId])

  const removeTag = useCallback(async (tagId: string) => {
    if (!participantId) throw new Error('Participant ID is required')

    const response = await authFetch(`/api/panel/participants/${participantId}/tags/${tagId}?organizationId=${organizationId}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to remove tag')
    }

    mutateTags() // Revalidate to update counts
  }, [participantId, authFetch, mutateTags, organizationId])

  const bulkAssignTag = useCallback(async (participantIds: string[], tagId: string) => {
    const response = await authFetch(`/api/panel/tags/${tagId}/bulk-assign?organizationId=${organizationId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ participant_ids: participantIds }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to bulk assign tag')
    }

    mutateTags()
    return response.json()
  }, [authFetch, mutateTags, organizationId])

  return {
    tags,
    assignTag,
    removeTag,
    bulkAssignTag,
  }
}
