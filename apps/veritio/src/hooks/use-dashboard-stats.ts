'use client'

import useSWR from 'swr'
import { SWR_KEYS, getAuthFetchInstance } from '@/lib/swr'
import { useCurrentOrganizationId, useCollaborationStore } from '@/stores/collaboration-store'

export interface DashboardStats {
  totalProjects: number
  totalStudies: number
  activeStudies: number
  totalParticipants: number
}

// Explicitly defined to avoid type regeneration issues
export interface RecentStudy {
  id: string
  title: string
  study_type: string
  status: string
  user_id: string | null
  is_archived: boolean
  created_at: string | null
  updated_at: string | null
  launched_at: string | null
  last_opened_at: string | null
  project_id: string
  project_name: string
  participant_count: number
}

export interface TopStudyByResponses {
  id: string
  title: string
  participant_count: number
}

export interface DashboardInsights {
  avgResponsesPerStudy: number
  responsesThisWeek: number
  responsesLastWeek: number
  topStudyType: {
    type: string
    percentage: number
  } | null
  avgCompletionRate: number
  topStudiesByResponses: TopStudyByResponses[]
}

export interface StudyTypeResponses {
  type: string
  label: string
  count: number
}

export interface DashboardProject {
  id: string
  name: string
}

export interface DashboardData {
  stats: DashboardStats
  recentStudies: RecentStudy[]
  insights: DashboardInsights
  studyTypeResponses: StudyTypeResponses[]
  projects: DashboardProject[]
}

const defaultDashboardData: DashboardData = {
  stats: {
    totalProjects: 0,
    totalStudies: 0,
    activeStudies: 0,
    totalParticipants: 0,
  },
  recentStudies: [],
  insights: {
    avgResponsesPerStudy: 0,
    responsesThisWeek: 0,
    responsesLastWeek: 0,
    topStudyType: null,
    avgCompletionRate: 0,
    topStudiesByResponses: [],
  },
  studyTypeResponses: [],
  projects: [],
}

const dashboardFetcher = async (url: string): Promise<DashboardData> => {
  const authFetch = getAuthFetchInstance()
  const response = await authFetch(url)
  if (!response.ok) {
    throw new Error('Failed to fetch dashboard stats')
  }
  return response.json()
}

/** Fetches org-scoped dashboard statistics and recent studies with SWR caching. Pass enabled=false to skip fetching. */
export function useDashboardStats(enabled: boolean = true, overrideOrganizationId?: string) {
  const currentOrgId = useCurrentOrganizationId()
  const isHydrated = useCollaborationStore((s) => s.isHydrated)
  // After hydration, currentOrgId reflects org switches. Before hydration, fall back to
  // the server-provided override to avoid a flash of wrong-org data during hydration delay.
  const orgId = (isHydrated ? currentOrgId : null) ?? overrideOrganizationId
  // Don't fetch until org store is hydrated — prevents flash of cross-org data
  // When override is provided, skip the hydration check (server already resolved the org)
  const swrKey = enabled && orgId ? SWR_KEYS.dashboard(orgId) : null

  const { data, error, isLoading: swrIsLoading, mutate } = useSWR<DashboardData>(
    swrKey,
    dashboardFetcher,
    {
      keepPreviousData: true,
      // Polling fallback — Supabase Realtime + broadcast handles live updates
      refreshInterval: 5 * 60 * 1000, // 5 minutes
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 10000,
    }
  )

  const dashboardData = data || defaultDashboardData

  return {
    stats: dashboardData.stats,
    recentStudies: dashboardData.recentStudies,
    insights: dashboardData.insights,
    studyTypeResponses: dashboardData.studyTypeResponses,
    projects: dashboardData.projects,
    isLoading: overrideOrganizationId ? swrIsLoading : (!isHydrated || swrIsLoading),
    error,
    refetch: () => mutate(),
  }
}
