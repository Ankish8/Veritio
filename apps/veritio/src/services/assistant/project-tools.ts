/**
 * Veritio AI Assistant — Project Tool Handlers
 *
 * Tools for the 'projects' mode: list studies within a project
 * and get aggregate project metrics.
 * All queries are scoped to the user's organization.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { ProjectToolName, ToolExecutionResult } from './types'
import { enrichStudiesWithParticipants, verifyProjectAccess } from './shared-enrichment'

interface ProjectToolContext {
  supabase: SupabaseClient
  projectId: string
  userId: string
}

/**
 * Route a project tool call to the appropriate handler.
 */
export async function executeProjectTool(
  toolName: ProjectToolName,
  args: Record<string, unknown>,
  ctx: ProjectToolContext,
): Promise<ToolExecutionResult> {
  switch (toolName) {
    case 'list_project_studies':
      return handleListProjectStudies(ctx, args)
    case 'get_project_summary':
      return handleGetProjectSummary(ctx)
    default:
      return { result: { error: `Unknown project tool: ${toolName}` } }
  }
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

async function handleListProjectStudies(
  ctx: ProjectToolContext,
  args: Record<string, unknown>,
): Promise<ToolExecutionResult> {
  const statusFilter = (args.status as string) || 'all'

  const hasAccess = await verifyProjectAccess(ctx.supabase, ctx.projectId, ctx.userId)
  if (!hasAccess) return { result: { error: 'Access denied to this project' } }

  let query = ctx.supabase
    .from('studies')
    .select('id, title, study_type, status, created_at, updated_at')
    .eq('project_id', ctx.projectId)
    .order('updated_at', { ascending: false })

  if (statusFilter !== 'all') query = query.eq('status', statusFilter)

  const { data: studies, error } = await query
  if (error) return { result: { error: 'Failed to fetch project studies' } }

  const studyIds = (studies ?? []).map((s: { id: string }) => s.id)
  const enriched = await enrichStudiesWithParticipants(ctx.supabase, studies ?? [], studyIds)

  return { result: { studies: enriched, count: enriched.length } }
}

async function handleGetProjectSummary(ctx: ProjectToolContext): Promise<ToolExecutionResult> {
  const hasAccess = await verifyProjectAccess(ctx.supabase, ctx.projectId, ctx.userId)
  if (!hasAccess) return { result: { error: 'Access denied to this project' } }

  const [
    { data: project },
    { data: studies },
  ] = await Promise.all([
    ctx.supabase.from('projects').select('id, name, created_at').eq('id', ctx.projectId).single(),
    ctx.supabase.from('studies').select('id, study_type, status').eq('project_id', ctx.projectId),
  ])

  const studyIds = (studies ?? []).map((s: { id: string }) => s.id)
  const statusCounts = countByField(studies ?? [], 'status')
  const typeCounts = countByField(studies ?? [], 'study_type')
  const participantStats = await getParticipantStats(ctx.supabase, studyIds)

  return {
    result: {
      project: project ?? { id: ctx.projectId },
      totalStudies: studies?.length ?? 0,
      ...participantStats,
      byStatus: statusCounts,
      byType: typeCounts,
    },
  }
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
