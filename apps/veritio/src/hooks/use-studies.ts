'use client'

import { useState, useCallback, useRef } from 'react'
import useSWR, { mutate as globalMutate } from 'swr'
import { SWR_KEYS, getAuthFetchInstance, swrFetcher } from '@/lib/swr'
import { createCRUDHook, createScopedArrayCRUDConfig } from '@/lib/swr/crud-factory'
import { invalidateCache } from '@/lib/swr/cache-invalidation'
import { broadcastDashboardChange } from '@/hooks/use-realtime-dashboard'
import type { Study } from '@veritio/study-types'

export interface StudyWithCount {
  id: string
  title: string
  description: string | null
  study_type: string
  status: string
  share_code: string | null
  project_id: string | null
  user_id: string | null
  settings: unknown
  welcome_message: string | null
  thank_you_message: string | null
  is_archived: boolean
  created_at: string | null
  updated_at: string | null
  launched_at: string | null
  email_notification_settings: unknown
  response_prevention_settings: unknown
  participant_count: number
  purpose: string | null
  participant_requirements: string | null
  url_slug: string | null
  language: string
  password: string | null
  session_recording_settings: unknown
  closing_rule: unknown
  branding: unknown
  file_attachments: unknown
  folder_id: string | null
}

type StudyType = 'card_sort' | 'tree_test' | 'survey' | 'prototype_test' | 'first_click' | 'first_impression' | 'live_website_test'

const studiesConfig = createScopedArrayCRUDConfig<StudyWithCount>({
  name: 'study',
  scopeParam: 'projectId',
  keyBuilder: (projectId) => SWR_KEYS.projectStudies(projectId),
  apiUrlBuilder: (projectId) => `/api/projects/${projectId}/studies`,
  defaultItem: {
    status: 'draft',
    share_code: '',
    settings: {},
    welcome_message: null,
    thank_you_message: null,
    launched_at: null,
    purpose: null,
    participant_requirements: null,
    url_slug: null,
    language: 'en-US',
    password: null,
    session_recording_settings: { enabled: false, captureMode: 'audio', recordingScope: 'session' },
    closing_rule: { type: 'none' },
    branding: {},
    participant_count: 0,
    is_archived: false,
    file_attachments: null,
    folder_id: null,
    email_notification_settings: null,
    response_prevention_settings: null,
  },
})

studiesConfig.fetcher = { type: 'globalUnwrap' }

const useStudiesInternal = createCRUDHook(studiesConfig)

/** Fetches and manages studies for a project with SWR caching and optimistic updates. */
export function useStudies(projectId: string, initialData?: StudyWithCount[]) {
   
  const opts: Record<string, unknown> = {
    initialData,
    skip: !projectId,
    // Immediately revalidate stale data on mount (fixes stale data after deletion)
    revalidateIfStale: true,
  }
  const result = useStudiesInternal({ projectId }, opts)

  const createStudy = async (
    title: string,
    studyType: StudyType,
    description?: string
  ): Promise<{ id: string; title: string; study_type: StudyType }> => {
    const created = await result.create?.({
      title,
      study_type: studyType,
      description: description || null,
      project_id: projectId,
    })
    if (!created) {
      throw new Error('Failed to create study')
    }
    // Refresh materialized view to prevent SWR caching stale stats
    try {
      const authFetch = getAuthFetchInstance()
      await authFetch('/api/internal/refresh-dashboard-stats', {
        method: 'POST',
      }).catch(() => {
        // Fail silently - the cron job will eventually refresh it
      })
    } catch {
      // Fail silently - the cron job will eventually refresh it
    }

    await invalidateCache('study:created', { studyId: created.id, projectId })

    await Promise.all([
      globalMutate((key) => typeof key === 'string' && key.startsWith('/api/dashboard/stats'), undefined, { revalidate: true }),
      globalMutate((key) => typeof key === 'string' && key.startsWith('/api/projects') && !key.includes('/studies'), undefined, { revalidate: true }),
      globalMutate((key) => typeof key === 'string' && key.startsWith('/api/studies'), undefined, { revalidate: true }),
    ])

    broadcastDashboardChange('study')

    return {
      id: created.id,
      title: created.title,
      study_type: created.study_type as StudyType,
    }
  }

  const extractStudies = (): StudyWithCount[] => {
    if (!result.data) return []
    if (Array.isArray(result.data)) return result.data
    // Handle case where paginated response wasn't unwrapped
    if (typeof result.data === 'object' && 'data' in result.data && Array.isArray((result.data as { data: unknown }).data)) {
      return (result.data as { data: StudyWithCount[] }).data
    }
    return []
  }

  return {
    studies: extractStudies(),
    isLoading: result.isLoading,
    error: result.error,
    refetch: result.refetch,
    createStudy,
  }
}

export type StudyWithParticipantCount = Study & {
  participant_count?: number
}

/** Fetches a single study with SWR caching and provides CRUD operations. */
export function useStudy(studyId: string, initialData?: StudyWithParticipantCount) {
  const { data: study, error, isLoading, mutate } = useSWR<StudyWithParticipantCount>(
    studyId ? SWR_KEYS.study(studyId) : null,
    null, // Uses global fetcher
    {
      fallbackData: initialData,
    }
  )

  const authFetch = getAuthFetchInstance()

  const updateStudy = async (updates: Partial<Study>) => {
    await mutate(
      async () => {
        const response = await authFetch(`/api/studies/${studyId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Failed to update study')
        }

        return response.json()
      },
      {
        optimisticData: study
          ? { ...study, ...updates, updated_at: new Date().toISOString() }
          : undefined,
        rollbackOnError: true,
        revalidate: false,
      }
    )
  }

  const deleteStudy = async () => {
    const response = await authFetch(`/api/studies/${studyId}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error || 'Failed to delete study')
    }

    if (study?.project_id) {
      globalMutate(SWR_KEYS.projectStudies(study.project_id))
    }
    globalMutate(SWR_KEYS.projects)
    await mutate(undefined, { revalidate: false })
    broadcastDashboardChange('study')
  }

  const launchStudy = async () => updateStudy({ status: 'active' })
  const pauseStudy = async () => updateStudy({ status: 'paused' })
  const completeStudy = async () => updateStudy({ status: 'completed' })

  const archiveStudy = async () => {
    const projectId = study?.project_id

    await mutate(
      async () => {
        const response = await authFetch(`/api/studies/${studyId}/archive`, {
          method: 'POST',
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Failed to archive study')
        }

        globalMutate(SWR_KEYS.projects)
        await invalidateCache('study:archived', {
          studyId,
          projectId,
        })
        broadcastDashboardChange('study')

        return undefined
      },
      {
        optimisticData: study
          ? { ...study, is_archived: true }
          : undefined,
        rollbackOnError: true,
        revalidate: false,
      }
    )
  }

  return {
    study: study || null,
    isLoading,
    error: error?.message || null,
    refetch: () => mutate(),
    updateStudy,
    deleteStudy,
    archiveStudy,
    launchStudy,
    pauseStudy,
    completeStudy,
  }
}

const PAGINATED_PAGE_SIZE = 10

interface PaginationState {
  cursor: string | null
  /** Stack of previous cursors. Empty string = page 1. */
  cursorStack: string[]
}

export interface PaginationInfo {
  page: number
  hasNextPage: boolean
  hasPrevPage: boolean
  total: number | null
  onNextPage: () => void
  onPrevPage: () => void
}

/**
 * Server-side paginated studies hook.
 * Loads PAGE_SIZE studies at a time using cursor-based pagination.
 * Prev/Next navigation maintains cursor history for back-navigation.
 */
export function usePaginatedStudies(
  projectId: string,
  options?: {
    initialData?: StudyWithCount[]
    initialHasMore?: boolean
  }
) {
  const authFetch = getAuthFetchInstance()

  const [paginationState, setPaginationState] = useState<PaginationState>({
    cursor: null,
    cursorStack: [],
  })

  const isFirstPage = paginationState.cursor === null
  const page = paginationState.cursorStack.length + 1

  const url = projectId
    ? paginationState.cursor
      ? `/api/projects/${projectId}/studies?limit=${PAGINATED_PAGE_SIZE}&cursor=${encodeURIComponent(paginationState.cursor)}`
      : `/api/projects/${projectId}/studies?limit=${PAGINATED_PAGE_SIZE}`
    : null

  const { data, isLoading, error, mutate } = useSWR<{
    data: StudyWithCount[]
    pagination: { nextCursor: string | null; hasMore: boolean; total: number | null }
  }>(
    url,
    swrFetcher,
    {
      fallbackData:
        isFirstPage && options?.initialData
          ? {
              data: options.initialData,
              pagination: {
                nextCursor: null,
                hasMore: options?.initialHasMore ?? false,
                total: null,
              },
            }
          : undefined,
      revalidateIfStale: true,
    }
  )

  // Preserve last known total so pagination bar doesn't flash "0 of 0" during page transitions
  const lastKnownTotalRef = useRef<number | null>(null)
  if (data?.pagination?.total != null) {
    lastKnownTotalRef.current = data.pagination.total // eslint-disable-line react-hooks/refs
  }

  const studies = data?.data ?? []
  const hasNextPage = data?.pagination?.hasMore ?? false
  const hasPrevPage = paginationState.cursorStack.length > 0

  const onNextPage = useCallback(() => {
    const nextCursor = data?.pagination?.nextCursor
    if (!nextCursor) return
    setPaginationState((prev) => ({
      cursor: nextCursor,
      cursorStack: [...prev.cursorStack, prev.cursor ?? ''],
    }))
  }, [data?.pagination?.nextCursor])

  const onPrevPage = useCallback(() => {
    setPaginationState((prev) => {
      const newStack = [...prev.cursorStack]
      const prevCursor = newStack.pop() ?? null
      return {
        cursor: prevCursor === '' ? null : prevCursor,
        cursorStack: newStack,
      }
    })
  }, [])

  const createStudy = async (
    title: string,
    studyType: StudyType,
    description?: string
  ): Promise<{ id: string; title: string; study_type: StudyType }> => {
    const response = await authFetch(`/api/projects/${projectId}/studies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        study_type: studyType,
        description: description || null,
        project_id: projectId,
      }),
    })
    if (!response.ok) {
      const err = await response.json()
      throw new Error(err.error || 'Failed to create study')
    }
    const created = await response.json()

    // Refresh dashboard stats
    try {
      await authFetch('/api/internal/refresh-dashboard-stats', { method: 'POST' }).catch(() => {})
    } catch {
      // Fail silently
    }

    // Invalidate all paginated pages for this project and reset to page 1
    await globalMutate(
      (key) =>
        typeof key === 'string' &&
        key.startsWith(`/api/projects/${projectId}/studies?limit=${PAGINATED_PAGE_SIZE}`),
      undefined,
      { revalidate: true }
    )
    // Go back to first page so new study is visible
    setPaginationState({ cursor: null, cursorStack: [] })

    await Promise.all([
      globalMutate(
        (key) => typeof key === 'string' && key.startsWith('/api/dashboard/stats'),
        undefined,
        { revalidate: true }
      ),
      globalMutate(
        (key) =>
          typeof key === 'string' &&
          key.startsWith('/api/projects') &&
          !key.includes('/studies'),
        undefined,
        { revalidate: true }
      ),
    ])

    return {
      id: created.id,
      title: created.title,
      study_type: created.study_type as StudyType,
    }
  }

  const refetch = useCallback(() => {
    mutate()
  }, [mutate])

  /* eslint-disable react-hooks/refs */
  const lastKnownTotal = lastKnownTotalRef.current

  return {
    studies,
    isLoading,
    error,
    pagination: {
      page,
      hasNextPage,
      hasPrevPage,
      total: data?.pagination?.total ?? lastKnownTotal,
      onNextPage,
      onPrevPage,
    } satisfies PaginationInfo,
    refetch,
    createStudy,
  }
}
