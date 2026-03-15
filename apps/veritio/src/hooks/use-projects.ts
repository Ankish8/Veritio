'use client'

import useSWR, { mutate as globalMutate } from 'swr'
import { SWR_KEYS, getAuthFetchInstance } from '@/lib/swr'
import { invalidateCache } from '@/lib/swr/cache-invalidation'
import { broadcastDashboardChange } from '@/hooks/use-realtime-dashboard'
import { useCurrentOrganizationId, useCollaborationStore } from '@/stores/collaboration-store'
import type { Project } from '@veritio/study-types'

export interface ProjectWithCount {
  id: string
  name: string
  description: string | null
  user_id: string | null
  organization_id: string | null
  visibility: string | null
  is_archived: boolean
  created_at: string | null
  updated_at: string | null
  study_count: number
}

const projectsFetcher = async (url: string): Promise<ProjectWithCount[]> => {
  const authFetch = getAuthFetchInstance()
  const response = await authFetch(url)
  if (!response.ok) {
    throw new Error('Failed to fetch projects')
  }
  return response.json()
}

/** Hook to fetch and manage projects with SWR caching. Scoped by organization for multi-tenancy. */
export function useProjects(initialData?: ProjectWithCount[]) {
  const currentOrgId = useCurrentOrganizationId()
  const isHydrated = useCollaborationStore((s) => s.isHydrated)
  // Don't fetch until org store is hydrated — prevents flash of all-org projects
  const swrKey = currentOrgId ? SWR_KEYS.projects(currentOrgId) : null

  // Filter SSR data to only the current org so fallbackData never shows cross-org projects
  const filteredFallback = isHydrated && currentOrgId && initialData
    ? initialData.filter((p) => p.organization_id === currentOrgId)
    : undefined

  const { data, error, isLoading: swrIsLoading, mutate: swrMutate } = useSWR<ProjectWithCount[]>(
    swrKey,
    projectsFetcher,
    {
      fallbackData: filteredFallback,
      revalidateOnFocus: false,
    }
  )

  // API expects camelCase 'organizationId', ProjectWithCount uses snake_case 'organization_id'
  const createProject = async (
    name: string,
    description?: string,
    organizationId?: string
  ): Promise<{ id: string; name: string }> => {
    const orgId = organizationId || currentOrgId
    if (!orgId) {
      throw new Error('Organization ID is required to create a project')
    }

    const authFetch = getAuthFetchInstance()
    const response = await authFetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        description: description || null,
        organizationId: orgId, // API expects camelCase
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || 'Failed to create project')
    }

    const created = await response.json()

    try {
      await authFetch('/api/internal/refresh-dashboard-stats', {
        method: 'POST',
      }).catch(() => {})
    } catch {
      // Fail silently
    }

    await invalidateCache('project:created', { projectId: created.id })

    await Promise.all([
      globalMutate((key) => typeof key === 'string' && key.startsWith('/api/dashboard/stats'), undefined, { revalidate: true }),
      globalMutate((key) => typeof key === 'string' && key.startsWith('/api/projects') && !key.includes('/studies'), undefined, { revalidate: true }),
    ])

    swrMutate()

    // Notify other org members via Supabase Broadcast
    broadcastDashboardChange('project')

    return { id: created.id, name: created.name }
  }

  const updateProject = async (
    id: string,
    updates: { name?: string; description?: string | null }
  ): Promise<void> => {
    const authFetch = getAuthFetchInstance()
    const response = await authFetch(`/api/projects/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || 'Failed to update project')
    }

    swrMutate()
    broadcastDashboardChange('project')
  }

  const deleteProject = async (id: string): Promise<void> => {
    const authFetch = getAuthFetchInstance()

    await swrMutate(
      async (currentData) => {
        const response = await authFetch(`/api/projects/${id}`, {
          method: 'DELETE',
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || 'Failed to delete project')
        }

        // Post-delete cache operations are best-effort — the project is already
        // deleted in the DB, so failures here must NOT roll back the optimistic UI.
        try {
          await authFetch('/api/internal/refresh-dashboard-stats', {
            method: 'POST',
          }).catch(() => {})
        } catch {
          // Fail silently
        }

        try {
          await invalidateCache('project:deleted', { projectId: id })
        } catch {
          // Fail silently — delete already succeeded
        }

        try {
          await Promise.all([
            globalMutate((key) => typeof key === 'string' && key.startsWith('/api/dashboard/stats'), undefined, { revalidate: true }),
            globalMutate((key) => typeof key === 'string' && key.startsWith('/api/projects') && !key.includes('/studies'), undefined, { revalidate: true }),
          ])
        } catch {
          // Fail silently — revalidation will happen on next focus/mount
        }

        // Notify other org members via Supabase Broadcast
        broadcastDashboardChange('project')

        return (currentData || []).filter((p) => p.id !== id)
      },
      {
        optimisticData: (currentData) =>
          (currentData || []).filter((p) => p.id !== id),
        rollbackOnError: true,
        revalidate: false,
      }
    )
  }

  const archiveProject = async (id: string): Promise<void> => {
    const authFetch = getAuthFetchInstance()

    await swrMutate(
      async (currentData) => {
        const response = await authFetch(`/api/projects/${id}/archive`, {
          method: 'POST',
        })

        if (!response.ok) {
          const apiData = await response.json()
          throw new Error(apiData.error || 'Failed to archive project')
        }

        try {
          await authFetch('/api/internal/refresh-dashboard-stats', {
            method: 'POST',
          }).catch(() => {})
        } catch {
          // Fail silently
        }

        try {
          await invalidateCache('project:archived', { projectId: id })
        } catch {
          // Fail silently — archive already succeeded
        }

        try {
          await Promise.all([
            globalMutate((key) => typeof key === 'string' && key.startsWith('/api/dashboard/stats'), undefined, { revalidate: true }),
            globalMutate((key) => typeof key === 'string' && key.startsWith('/api/projects') && !key.includes('/studies'), undefined, { revalidate: true }),
          ])
        } catch {
          // Fail silently — revalidation will happen on next focus/mount
        }

        broadcastDashboardChange('project')

        return (currentData || []).filter((p) => p.id !== id)
      },
      {
        optimisticData: (currentData) =>
          (currentData || []).filter((p) => p.id !== id),
        rollbackOnError: true,
        revalidate: false,
      }
    )
  }

  return {
    projects: data || [],
    // Treat pre-hydration as loading so the skeleton shows instead of empty/wrong data
    isLoading: !isHydrated || swrIsLoading,
    error,
    refetch: () => swrMutate(),
    createProject,
    updateProject,
    deleteProject,
    archiveProject,
  }
}

const singleProjectFetcher = async (url: string): Promise<Project | null> => {
  const authFetch = getAuthFetchInstance()
  const response = await authFetch(url)
  if (!response.ok) {
    if (response.status === 404) return null
    throw new Error('Failed to fetch project')
  }
  return response.json()
}

/** Hook to fetch a single project with SWR caching. */
export function useProject(projectId: string, initialData?: Project) {
  const { data, isLoading, error } = useSWR<Project | null>(
    projectId ? SWR_KEYS.project(projectId) : null,
    singleProjectFetcher,
    {
      fallbackData: initialData,
    }
  )

  return {
    project: data ?? null,
    isLoading,
    error,
  }
}
