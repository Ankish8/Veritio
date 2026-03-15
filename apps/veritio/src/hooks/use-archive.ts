'use client'

import { useCallback } from 'react'
import useSWR from 'swr'
import { SWR_KEYS, getAuthFetchInstance, swrFetcherUnwrap } from '@/lib/swr'
import { invalidateCache } from '@/lib/swr/cache-invalidation'
import { broadcastDashboardChange } from '@/hooks/use-realtime-dashboard'

// Explicitly define ArchivedProject with all needed fields
// (instead of extending Project to avoid type regeneration issues)
export interface ArchivedProject {
  id: string
  name: string
  description: string | null
  user_id: string | null
  is_archived: boolean
  created_at: string | null
  updated_at: string | null
  study_count: number
}

// Explicitly define ArchivedStudy with all needed fields
export interface ArchivedStudy {
  id: string
  title: string
  study_type: string
  project_id: string | null
  user_id: string | null
  is_archived: boolean
  created_at: string | null
  updated_at: string | null
  participant_count: number
}

/** Fetches and manages archived projects with SWR caching. */
export function useArchivedProjects(initialData?: ArchivedProject[]) {
  const { data: projects, error, isLoading, mutate } = useSWR<ArchivedProject[]>(
    SWR_KEYS.archivedProjects,
    swrFetcherUnwrap, // Extracts data from { data: T[] } response
    {
      fallbackData: initialData,
    }
  )

  // Auth fetch for mutations only
  const authFetch = getAuthFetchInstance()

  const restoreProject = useCallback(async (projectId: string) => {
    await mutate(
      async (currentData) => {
        const response = await authFetch(`/api/projects/${projectId}/restore`, {
          method: 'POST',
        })

        if (!response.ok) {
          throw new Error('Failed to restore project')
        }

        // Invalidate active projects cache to show restored project
        await invalidateCache('project:unarchived', { projectId })
        broadcastDashboardChange('project')

        // Return data without the restored project
        return (currentData || []).filter((p) => p.id !== projectId)
      },
      {
        // Immediately remove from archived list (optimistic update)
        optimisticData: (currentData) =>
          (currentData || []).filter((p) => p.id !== projectId),
        rollbackOnError: true,
        revalidate: false,
      }
    )
  }, [authFetch, mutate])

  const deleteProject = useCallback(async (projectId: string) => {
    await mutate(
      async (currentData) => {
        const response = await authFetch(`/api/projects/${projectId}`, {
          method: 'DELETE',
        })

        if (!response.ok) {
          throw new Error('Failed to delete project')
        }

        // Use cache orchestrator for cross-cache invalidation
        await invalidateCache('project:deleted', { projectId })
        broadcastDashboardChange('project')

        // Return data without the deleted project
        return (currentData || []).filter((p) => p.id !== projectId)
      },
      {
        // Immediately remove from UI (optimistic update)
        optimisticData: (currentData) =>
          (currentData || []).filter((p) => p.id !== projectId),
        rollbackOnError: true,
        revalidate: false,
      }
    )
  }, [authFetch, mutate])

  return {
    projects: Array.isArray(projects) ? projects : [],
    isLoading,
    error: error?.message || null,
    refetch: () => mutate(),
    restoreProject,
    deleteProject,
  }
}

/** Fetches and manages archived studies with SWR caching. */
export function useArchivedStudies(initialData?: ArchivedStudy[]) {
  const { data: studies, error, isLoading, mutate } = useSWR<ArchivedStudy[]>(
    SWR_KEYS.archivedStudies,
    swrFetcherUnwrap, // Extracts data from { data: T[] } response
    {
      fallbackData: initialData,
    }
  )

  // Auth fetch for mutations only
  const authFetch = getAuthFetchInstance()

  const restoreStudy = useCallback(async (studyId: string) => {
    await mutate(
      async (currentData) => {
        const response = await authFetch(`/api/studies/${studyId}/restore`, {
          method: 'POST',
        })

        if (!response.ok) {
          throw new Error('Failed to restore study')
        }

        // Use cache orchestrator for cross-cache invalidation
        await invalidateCache('study:unarchived', { studyId })
        broadcastDashboardChange('study')

        // Return data without the restored study
        return (currentData || []).filter((s) => s.id !== studyId)
      },
      {
        // Immediately remove from archived list (optimistic update)
        optimisticData: (currentData) =>
          (currentData || []).filter((s) => s.id !== studyId),
        rollbackOnError: true,
        revalidate: false,
      }
    )
  }, [authFetch, mutate])

  const deleteStudy = useCallback(async (studyId: string) => {
    await mutate(
      async (currentData) => {
        const response = await authFetch(`/api/studies/${studyId}`, {
          method: 'DELETE',
        })

        if (!response.ok) {
          throw new Error('Failed to delete study')
        }

        // Use cache orchestrator for cross-cache invalidation
        await invalidateCache('study:deleted', { studyId })
        broadcastDashboardChange('study')

        // Return data without the deleted study
        return (currentData || []).filter((s) => s.id !== studyId)
      },
      {
        // Immediately remove from UI (optimistic update)
        optimisticData: (currentData) =>
          (currentData || []).filter((s) => s.id !== studyId),
        rollbackOnError: true,
        revalidate: false,
      }
    )
  }, [authFetch, mutate])

  return {
    studies: Array.isArray(studies) ? studies : [],
    isLoading,
    error: error?.message || null,
    refetch: () => mutate(),
    restoreStudy,
    deleteStudy,
  }
}
