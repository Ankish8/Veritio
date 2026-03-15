/**
 * Veritio AI Assistant — Dashboard Tool Handlers
 *
 * Tools for the 'dashboard' mode: organization-level metrics,
 * recent studies, and cross-study comparisons.
 * All queries are scoped to the user's organization.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { DashboardToolName, ToolExecutionResult } from './types'
import { enrichStudiesWithParticipants, getUserProjectIds } from './shared-enrichment'

interface DashboardToolContext {
  supabase: SupabaseClient
  userId: string
}

/**
 * Route a dashboard tool call to the appropriate handler.
 */
export async function executeDashboardTool(
  toolName: DashboardToolName,
  args: Record<string, unknown>,
  ctx: DashboardToolContext,
): Promise<ToolExecutionResult> {
  switch (toolName) {
    case 'list_recent_studies':
      return handleListRecentStudies(ctx, args)
    case 'get_organization_stats':
      return handleGetOrganizationStats(ctx)
    case 'compare_studies':
      return handleCompareStudies(ctx, args)
    default:
      return { result: { error: `Unknown dashboard tool: ${toolName}` } }
  }
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

async function handleListRecentStudies(
  ctx: DashboardToolContext,
  args: Record<string, unknown>,
): Promise<ToolExecutionResult> {
  const limit = (args.limit as number) || 20
  const statusFilter = (args.status as string) || 'all'

  const projectIds = await getUserProjectIds(ctx.supabase, ctx.userId)
  if (projectIds.length === 0) {
    return { result: { studies: [], count: 0, message: 'No projects found for this user' } }
  }

  let query = ctx.supabase
    .from('studies')
    .select('id, title, study_type, status, created_at, updated_at, project_id')
    .in('project_id', projectIds)
    .order('updated_at', { ascending: false })
    .limit(limit)

  if (statusFilter !== 'all') {
    query = query.eq('status', statusFilter)
  }

  const { data: studies, error } = await query

  if (error) return { result: { error: 'Failed to fetch recent studies' } }

  const studyIds = (studies ?? []).map((s: { id: string }) => s.id)
  const enriched = await enrichStudiesWithParticipants(ctx.supabase, studies ?? [], studyIds)

  return { result: { studies: enriched, count: enriched.length } }
}

async function handleGetOrganizationStats(ctx: DashboardToolContext): Promise<ToolExecutionResult> {
  const projectIds = await getUserProjectIds(ctx.supabase, ctx.userId)
  if (projectIds.length === 0) return { result: { error: 'No projects found for this user' } }

  const [
    { count: totalStudies },
    { data: studiesByStatus },
    { data: studiesByType },
    { data: allStudies },
  ] = await Promise.all([
    ctx.supabase.from('studies').select('id', { count: 'exact', head: true }).in('project_id', projectIds),
    ctx.supabase.from('studies').select('status').in('project_id', projectIds),
    ctx.supabase.from('studies').select('study_type').in('project_id', projectIds),
    ctx.supabase.from('studies').select('id').in('project_id', projectIds),
  ])

  const statusCounts = countByField(studiesByStatus ?? [], 'status')
  const typeCounts = countByField(studiesByType ?? [], 'study_type')

  const allStudyIds = (allStudies ?? []).map((s: { id: string }) => s.id)
  const participantStats = await getParticipantStats(ctx.supabase, allStudyIds)

  return {
    result: {
      totalStudies: totalStudies ?? 0,
      ...participantStats,
      projectCount: projectIds.length,
      byStatus: statusCounts,
      byType: typeCounts,
    },
  }
}

async function handleCompareStudies(
  ctx: DashboardToolContext,
  args: Record<string, unknown>,
): Promise<ToolExecutionResult> {
  const studyIds = args.study_ids as string[] | undefined
  const projectIds = await getUserProjectIds(ctx.supabase, ctx.userId)

  if (projectIds.length === 0) return { result: { error: 'No projects found for this user' } }

  let query = ctx.supabase
    .from('studies')
    .select('id, title, study_type, status, created_at, updated_at')
    .in('project_id', projectIds)
    .order('updated_at', { ascending: false })

  query = studyIds && studyIds.length > 0 ? query.in('id', studyIds) : query.limit(10)

  const { data: studies, error } = await query
  if (error) return { result: { error: 'Failed to fetch studies for comparison' } }

  const ids = (studies ?? []).map((s: { id: string }) => s.id)
  const enriched = await enrichStudiesWithParticipants(ctx.supabase, studies ?? [], ids)

  return { result: { studies: enriched, count: enriched.length } }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function countByField<T extends Record<string, unknown>>(items: T[], field: keyof T): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const item of items) {
    const key = String(item[field])
    counts[key] = (counts[key] || 0) + 1
  }
  return counts
}

async function getParticipantStats(
  supabase: SupabaseClient,
  studyIds: string[],
): Promise<{ totalParticipants: number; completedParticipants: number; avgCompletionRate: number }> {
  if (studyIds.length === 0) return { totalParticipants: 0, completedParticipants: 0, avgCompletionRate: 0 }

  const [{ count: total }, { count: completed }] = await Promise.all([
    supabase.from('participants').select('id', { count: 'exact', head: true }).in('study_id', studyIds),
    supabase
      .from('participants')
      .select('id', { count: 'exact', head: true })
      .in('study_id', studyIds)
      .eq('status', 'completed'),
  ])

  const totalParticipants = total ?? 0
  const completedParticipants = completed ?? 0
  const avgCompletionRate = totalParticipants > 0 ? Math.round((completedParticipants / totalParticipants) * 100) : 0

  return { totalParticipants, completedParticipants, avgCompletionRate }
}
