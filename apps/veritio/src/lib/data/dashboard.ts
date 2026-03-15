import 'server-only'

import { cache } from 'react'
import { createClient } from '../supabase/server'
import { getServerUserId } from '@veritio/auth/server'
import type { DashboardData, DashboardProject, DashboardStats, RecentStudy } from '../../hooks/use-dashboard-stats'

/**
 * Server-side dashboard data fetcher.
 * Fetches all dashboard stats and recent studies in parallel.
 * Uses React cache() for request deduplication within a single render pass.
 */
export const getDashboardData = cache(async (): Promise<DashboardData | null> => {
  const userId = await getServerUserId()
  if (!userId) return null

  const supabase = await createClient()

  // Parallel fetch for maximum performance (follows PERFORMANCE-GUIDELINES.md)
  const [projectsRes, projectListRes, studiesRes, activeStudiesRes, participantsRes, recentRes] = await Promise.all([
    // Count total projects
    supabase
      .from('projects')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_archived', false),

    // Fetch project list (id + name) for the dashboard dropdown
    supabase
      .from('projects')
      .select('id, name')
      .eq('user_id', userId)
      .eq('is_archived', false)
      .order('name'),

    // Count total studies
    supabase
      .from('studies')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_archived', false),

    // Count active studies
    supabase
      .from('studies')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'active')
      .eq('is_archived', false),

    // Count total participants across all user's studies
    supabase
      .from('participants')
      .select('id, studies!inner(user_id)', { count: 'exact', head: true })
      .eq('studies.user_id', userId),

    // Get recent studies with project names and participant counts
    supabase
      .from('studies')
      .select(`
        id,
        title,
        study_type,
        status,
        user_id,
        is_archived,
        created_at,
        updated_at,
        launched_at,
        project_id,
        projects!inner(name),
        participants(count)
      `)
      .eq('user_id', userId)
      .eq('is_archived', false)
      .order('updated_at', { ascending: false, nullsFirst: false })
      .limit(10),
  ])

  // Build stats object
  const stats: DashboardStats = {
    totalProjects: projectsRes.count ?? 0,
    totalStudies: studiesRes.count ?? 0,
    activeStudies: activeStudiesRes.count ?? 0,
    totalParticipants: participantsRes.count ?? 0,
  }

  // Transform recent studies to match expected shape
  const recentStudies: RecentStudy[] = (recentRes.data ?? []).map((study) => {
    // Extract project name from joined data
    const projectName = (study.projects as { name: string } | null)?.name ?? ''

    // Extract participant count from aggregated data
    const participantCount = Array.isArray(study.participants)
      ? (study.participants[0] as { count: number } | undefined)?.count ?? 0
      : 0

    return {
      id: study.id,
      title: study.title,
      study_type: study.study_type,
      status: study.status ?? 'draft',
      user_id: study.user_id,
      is_archived: study.is_archived,
      created_at: study.created_at,
      updated_at: study.updated_at,
      launched_at: study.launched_at,
      last_opened_at: study.updated_at, // Use updated_at as proxy for last_opened_at
      project_id: study.project_id,
      project_name: projectName,
      participant_count: participantCount,
    }
  })

  // Default insights and study type responses (can be populated by a separate call if needed)
  const insights = {
    avgResponsesPerStudy: 0,
    responsesThisWeek: 0,
    responsesLastWeek: 0,
    topStudyType: null,
    avgCompletionRate: 0,
    topStudiesByResponses: [],
  }

  const studyTypeResponses: { type: string; label: string; count: number }[] = []

  // Build project list for dropdown
  const projects: DashboardProject[] = (projectListRes.data ?? []).map((p) => ({
    id: p.id,
    name: p.name,
  }))

  return {
    stats,
    recentStudies,
    insights,
    studyTypeResponses,
    projects,
  }
})
