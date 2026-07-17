import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Study } from '@veritio/study-types'
import { getUserOrgIds, resolveOrgScope } from './membership-utils'
import { getStudyTypeLabel } from '../lib/study-type-labels'
import {
  getExcludedParticipantCountsByStudyId,
  getParticipantAnalysisCounts,
} from '../lib/analysis/participant-analysis-counts'

type SupabaseClientType = SupabaseClient<Database>

export interface DashboardStats {
  totalProjects: number
  totalStudies: number
  activeStudies: number
  totalParticipants: number
}

export interface StudyTypeCount {
  type: 'card_sort' | 'tree_test' | 'survey' | 'prototype_test' | 'first_click' | 'first_impression'
  count: number
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

export interface RecentStudy extends Study {
  project_name: string
  project_id: string
  participant_count: number
  excluded_participant_count: number
  analysis_included_participant_count: number
}

export interface DashboardProject {
  id: string
  name: string
}

const EMPTY_STATS: DashboardStats = {
  totalProjects: 0,
  totalStudies: 0,
  activeStudies: 0,
  totalParticipants: 0,
}

async function fetchDashboardStatsFromTables(
  supabase: SupabaseClientType,
  orgIds: string[]
): Promise<{ data: DashboardStats; error: Error | null }> {
  const { count: projectCount, error: projectError } = await supabase
    .from('projects')
    .select('*', { count: 'exact', head: true })
    .in('organization_id', orgIds)
    .eq('is_archived', false)

  if (projectError) {
    return { data: EMPTY_STATS, error: new Error(projectError.message) }
  }

  const { data: studyCounts, error: studyError } = await supabase
    .from('studies')
    .select('status')
    .in('organization_id', orgIds)
    .eq('is_archived', false)

  if (studyError) {
    return { data: EMPTY_STATS, error: new Error(studyError.message) }
  }

  const totalStudies = studyCounts?.length || 0
  const activeStudies = studyCounts?.filter((study) => study.status === 'active').length || 0

  const { count: participantCount, error: participantError } = await supabase
    .from('participants')
    .select('id, studies!inner(organization_id)', { count: 'exact', head: true })
    .in('studies.organization_id', orgIds)
    .eq('studies.is_archived', false)
    .eq('status', 'completed')

  if (participantError) {
    return { data: EMPTY_STATS, error: new Error(participantError.message) }
  }

  return {
    data: {
      totalProjects: projectCount || 0,
      totalStudies,
      activeStudies,
      totalParticipants: participantCount || 0,
    },
    error: null,
  }
}

export async function getDashboardStats(
  supabase: SupabaseClientType,
  userId: string,
  organizationId?: string
): Promise<{ data: DashboardStats | null; error: Error | null }> {
  const { data: userOrgIds, error: memberError } = await getUserOrgIds(supabase, userId)
  if (memberError) return { data: null, error: memberError }
  if (!userOrgIds || userOrgIds.length === 0) return { data: EMPTY_STATS, error: null }

  const orgIds = resolveOrgScope(userOrgIds, organizationId)

  // Headline counters need to match the Projects and Studies views immediately.
  // The materialized view can lag behind project creation, so count live tables.
  const fallback = await fetchDashboardStatsFromTables(supabase, orgIds)
  return { data: fallback.data, error: fallback.error }
}

export async function getDashboardInsights(
  supabase: SupabaseClientType,
  userId: string,
  organizationId?: string
): Promise<{ data: DashboardInsights | null; error: Error | null }> {
  const { data: memberships, error: memberError } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', userId)
    .not('joined_at', 'is', null)

  if (memberError) {
    return { data: null, error: new Error(memberError.message) }
  }

  const userOrgIds = memberships?.map((m) => m.organization_id) || []

  if (userOrgIds.length === 0) {
    return {
      data: {
        avgResponsesPerStudy: 0,
        responsesThisWeek: 0,
        responsesLastWeek: 0,
        topStudyType: null,
        avgCompletionRate: 0,
        topStudiesByResponses: [],
      },
      error: null,
    }
  }

  const orgIds = organizationId && userOrgIds.includes(organizationId)
    ? [organizationId]
    : userOrgIds

  // Study metadata and completed-participant counts come back in one query;
  // this previously re-fetched the same studies by id just for their counts.
  const { data: studies, error: studiesError } = await supabase
    .from('studies')
    .select('id, title, study_type, participants:participants(count)')
    .in('organization_id', orgIds)
    .eq('is_archived', false)
    .eq('participants.status', 'completed')

  if (studiesError) {
    return { data: null, error: new Error(studiesError.message) }
  }

  let totalResponses = 0
  const studyResponseCounts = new Map<string, number>()

  ;((studies || []) as unknown as Array<{
    id: string
    participants: Array<{ count: number }>
  }>).forEach((study) => {
    const count = study.participants?.[0]?.count || 0
    studyResponseCounts.set(study.id, count)
    totalResponses += count
  })

  const totalStudies = studies?.length || 0
  const avgResponsesPerStudy = totalStudies > 0 ? totalResponses / totalStudies : 0

  const topStudiesByResponses = (studies || [])
    .map(s => ({
      id: s.id,
      title: s.title,
      participant_count: studyResponseCounts.get(s.id) || 0,
    }))
    .filter(s => s.participant_count > 0)
    .sort((a, b) => b.participant_count - a.participant_count)
    .slice(0, 5)

  const now = new Date()
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

  const [thisWeekRes, lastWeekRes, completionRateRes] = await Promise.all([
    supabase
      .from('participants')
      .select('id, studies!inner(organization_id)', { count: 'exact', head: true })
      .in('studies.organization_id', orgIds)
      .eq('status', 'completed')
      .gte('completed_at', oneWeekAgo.toISOString()),

    supabase
      .from('participants')
      .select('id, studies!inner(organization_id)', { count: 'exact', head: true })
      .in('studies.organization_id', orgIds)
      .eq('status', 'completed')
      .gte('completed_at', twoWeeksAgo.toISOString())
      .lt('completed_at', oneWeekAgo.toISOString()),

    supabase
      .from('participants')
      .select('status, studies!inner(organization_id)')
      .in('studies.organization_id', orgIds)
      .gte('started_at', new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()),
  ])

  if (thisWeekRes.error || lastWeekRes.error || completionRateRes.error) {
    const errorMsg = thisWeekRes.error?.message || lastWeekRes.error?.message || completionRateRes.error?.message
    return { data: null, error: new Error(errorMsg || 'Failed to fetch participant stats') }
  }

  const responsesThisWeek = thisWeekRes.count || 0
  const responsesLastWeek = lastWeekRes.count || 0

  const typeCounts = new Map<string, number>()
  ;(studies || []).forEach(study => {
    const type = study.study_type || 'unknown'
    typeCounts.set(type, (typeCounts.get(type) || 0) + 1)
  })

  let topStudyType: { type: string; percentage: number } | null = null
  if (typeCounts.size > 0) {
    const entries = Array.from(typeCounts.entries())
    entries.sort((a, b) => b[1] - a[1])
    const [type, count] = entries[0]
    const percentage = (count / totalStudies) * 100

    topStudyType = {
      type: getStudyTypeLabel(type),
      percentage,
    }
  }

  const recentParticipants = completionRateRes.data || []
  const totalParticipants = recentParticipants.length
  const completedParticipants = recentParticipants.filter(p => p.status === 'completed').length

  const avgCompletionRate =
    totalParticipants > 0
      ? (completedParticipants / totalParticipants) * 100
      : 0

  return {
    data: {
      avgResponsesPerStudy: Math.round(avgResponsesPerStudy * 10) / 10,
      responsesThisWeek: responsesThisWeek || 0,
      responsesLastWeek: responsesLastWeek || 0,
      topStudyType,
      avgCompletionRate: Math.round(avgCompletionRate * 10) / 10,
      topStudiesByResponses,
    },
    error: null,
  }
}

export async function getStudyTypeResponses(
  supabase: SupabaseClientType,
  userId: string,
  organizationId?: string
): Promise<{ data: StudyTypeResponses[] | null; error: Error | null }> {
  const { data: memberships, error: memberError } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', userId)
    .not('joined_at', 'is', null)

  if (memberError) {
    return { data: null, error: new Error(memberError.message) }
  }

  const userOrgIds = memberships?.map((m) => m.organization_id) || []

  if (userOrgIds.length === 0) {
    return { data: [], error: null }
  }

  const orgIds = organizationId && userOrgIds.includes(organizationId)
    ? [organizationId]
    : userOrgIds

  // Completed-participant counts are aggregated per study in the query itself;
  // this previously fetched one row per completed participant and counted in JS.
  const { data: studies, error } = await supabase
    .from('studies')
    .select('id, study_type, participants:participants(count)')
    .in('organization_id', orgIds)
    .eq('is_archived', false)
    .eq('participants.status', 'completed')

  if (error) {
    return { data: null, error: new Error(error.message) }
  }

  const typeResponseMap = new Map<string, number>()

  ;((studies || []) as unknown as Array<{
    id: string
    study_type: string | null
    participants: Array<{ count: number }>
  }>).forEach(study => {
    const type = study.study_type || 'unknown'
    const responseCount = study.participants?.[0]?.count || 0
    typeResponseMap.set(type, (typeResponseMap.get(type) || 0) + responseCount)
  })

  const result: StudyTypeResponses[] = Array.from(typeResponseMap.entries())
    .map(([type, count]) => ({
      type,
      label: getStudyTypeLabel(type),
      count,
    }))
    .filter(item => item.count > 0)
    .sort((a, b) => b.count - a.count)

  return { data: result, error: null }
}

export async function getRecentStudies(
  supabase: SupabaseClientType,
  userId: string,
  limit: number = 10,
  organizationId?: string
): Promise<{ data: RecentStudy[] | null; error: Error | null }> {
  const { data: memberships, error: memberError } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', userId)
    .not('joined_at', 'is', null)

  if (memberError) {
    return { data: null, error: new Error(memberError.message) }
  }

  const userOrgIds = memberships?.map((m) => m.organization_id) || []

  if (userOrgIds.length === 0) {
    return { data: [], error: null }
  }

  const orgIds = organizationId && userOrgIds.includes(organizationId)
    ? [organizationId]
    : userOrgIds

  const { data: studies, error } = await supabase
    .from('studies')
    .select(`
      *,
      projects!inner(id, name),
      participants:participants(count)
    `)
    .in('organization_id', orgIds)
    .eq('is_archived', false)
    .order('updated_at', { ascending: false })
    .limit(limit)

  if (error) {
    return { data: null, error: new Error(error.message) }
  }

  const recentStudyRows = (studies || []) as unknown as Array<
    Study & {
      projects: { id: string; name: string }
      participants: Array<{ count: number }>
    }
  >
  const excludedCountsByStudyId = await getExcludedParticipantCountsByStudyId(
    supabase,
    recentStudyRows.map((study) => study.id)
  )

  const recentStudies = recentStudyRows.map(study => {
    const { projects, participants, ...rest } = study
    const participantCount = participants?.[0]?.count || 0

    return {
      ...rest,
      project_id: projects.id,
      project_name: projects.name,
      ...getParticipantAnalysisCounts(
        participantCount,
        excludedCountsByStudyId.get(study.id) ?? 0
      ),
    }
  }) as RecentStudy[]

  return { data: recentStudies, error: null }
}

export async function listAllStudies(
  supabase: SupabaseClientType,
  userId: string,
  options: {
    type?: 'card_sort' | 'tree_test' | 'survey' | 'prototype_test' | 'first_click' | 'first_impression' | 'live_website_test'
    status?: 'draft' | 'active' | 'paused' | 'completed'
    search?: string
    archived?: boolean
    limit?: number
    offset?: number
  } = {}
): Promise<{ data: RecentStudy[] | null; total: number; error: Error | null }> {
  const { type, status, search, archived = false, limit = 50, offset = 0 } = options

  // Try RPC first; fall back to query if unavailable
  const { data: rpcResult, error: rpcError } = await (supabase.rpc as any)('list_user_studies', {
    p_user_id: userId,
    p_study_type: type || null,
    p_status: status || null,
    p_search: search || null,
    p_archived: archived,
    p_limit: limit,
    p_offset: offset,
  })

  if (!rpcError && rpcResult) {
    const studies = (rpcResult as Array<{
      id: string
      title: string
      description: string | null
      study_type: string
      status: string
      user_id: string | null
      is_archived: boolean
      created_at: string | null
      updated_at: string | null
      launched_at: string | null
      project_id: string
      project_name: string
      participant_count: number
      total_count: number
    }>)

    const total = studies.length > 0 ? studies[0].total_count : 0
    const excludedCountsByStudyId = await getExcludedParticipantCountsByStudyId(
      supabase,
      studies.map((study) => study.id)
    )

    const allStudies = studies.map(({ total_count: _totalCount, participant_count, ...study }) => ({
      ...study,
      ...getParticipantAnalysisCounts(
        participant_count,
        excludedCountsByStudyId.get(study.id) ?? 0
      ),
    })) as unknown as RecentStudy[]

    return { data: allStudies, total, error: null }
  }

  const { data: memberships, error: memberError } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', userId)
    .not('joined_at', 'is', null)

  if (memberError) {
    return { data: null, total: 0, error: new Error(memberError.message) }
  }

  const orgIds = memberships?.map((m) => m.organization_id) || []

  if (orgIds.length === 0) {
    return { data: [], total: 0, error: null }
  }

  let query = supabase
    .from('studies')
    .select(`
      *,
      projects!inner(id, name),
      participants:participants(count)
    `, { count: 'exact' })
    .in('organization_id', orgIds)
    .eq('is_archived', archived)

  if (type) {
    query = query.eq('study_type', type)
  }

  if (status) {
    query = query.eq('status', status)
  }

  if (search) {
    query = query.ilike('title', `%${search}%`)
  }

  const { data: studies, count, error } = await query
    .order('updated_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    return { data: null, total: 0, error: new Error(error.message) }
  }

  const studyRows = (studies || []) as unknown as Array<
    Study & {
      projects: { id: string; name: string }
      participants: Array<{ count: number }>
    }
  >
  const excludedCountsByStudyId = await getExcludedParticipantCountsByStudyId(
    supabase,
    studyRows.map((study) => study.id)
  )

  const allStudies = studyRows.map(study => {
    const { projects, participants, ...rest } = study
    const participantCount = participants?.[0]?.count || 0

    return {
      ...rest,
      project_id: projects.id,
      project_name: projects.name,
      ...getParticipantAnalysisCounts(
        participantCount,
        excludedCountsByStudyId.get(study.id) ?? 0
      ),
    }
  }) as RecentStudy[]

  return { data: allStudies, total: count || 0, error: null }
}

export async function getProjectList(
  supabase: SupabaseClientType,
  userId: string,
  organizationId?: string
): Promise<{ data: DashboardProject[] | null; error: Error | null }> {
  const { data: memberships, error: memberError } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', userId)
    .not('joined_at', 'is', null)

  if (memberError) {
    return { data: null, error: new Error(memberError.message) }
  }

  const userOrgIds = memberships?.map((m) => m.organization_id) || []

  if (userOrgIds.length === 0) {
    return { data: [], error: null }
  }

  const orgIds = organizationId && userOrgIds.includes(organizationId)
    ? [organizationId]
    : userOrgIds

  const { data, error } = await supabase
    .from('projects')
    .select('id, name')
    .in('organization_id', orgIds)
    .eq('is_archived', false)
    .order('name')

  if (error) {
    return { data: null, error: new Error(error.message) }
  }

  return {
    data: (data || []).map((p) => ({ id: p.id, name: p.name })),
    error: null,
  }
}
