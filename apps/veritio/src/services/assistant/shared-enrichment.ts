/**
 * Shared enrichment utilities for dashboard and project tools
 */

import type { SupabaseClient } from '@supabase/supabase-js'

interface ParticipantCounts {
  total: number
  completed: number
}

interface EnrichedStudy {
  participantCount: number
  completedCount: number
  completionRate: number
}

/**
 * Enrich studies with participant counts and completion rates.
 */
export async function enrichStudiesWithParticipants<T extends { id: string }>(
  supabase: SupabaseClient,
  studies: T[],
  studyIds: string[],
): Promise<(T & EnrichedStudy)[]> {
  if (studyIds.length === 0) return studies.map((s) => ({ ...s, ...getDefaultCounts() }))

  const { data: participants } = await supabase
    .from('participants')
    .select('study_id, status')
    .in('study_id', studyIds)

  const countMap = buildCountMap(participants ?? [])

  return studies.map((study) => ({
    ...study,
    ...getStudyCounts(countMap.get(study.id)),
  }))
}

/**
 * Get user's project IDs via organization membership.
 */
export async function getUserProjectIds(supabase: SupabaseClient, userId: string): Promise<string[]> {
  const { data } = await supabase
    .from('projects')
    .select('id, organization:organizations!inner(members:organization_members!inner(user_id))')
    .eq('organizations.organization_members.user_id', userId)

  return (data ?? []).map((p: { id: string }) => p.id)
}

/**
 * Verify user has access to a project.
 */
export async function verifyProjectAccess(
  supabase: SupabaseClient,
  projectId: string,
  userId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from('projects')
    .select('id, organization:organizations!inner(members:organization_members!inner(user_id))')
    .eq('id', projectId)
    .eq('organizations.organization_members.user_id', userId)
    .single()

  return !!data
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildCountMap(
  participants: Array<{ study_id: string; status: string }>,
): Map<string, ParticipantCounts> {
  const countMap = new Map<string, ParticipantCounts>()

  for (const p of participants) {
    const existing = countMap.get(p.study_id) ?? { total: 0, completed: 0 }
    existing.total++
    if (p.status === 'completed') existing.completed++
    countMap.set(p.study_id, existing)
  }

  return countMap
}

function getStudyCounts(counts: ParticipantCounts | undefined): EnrichedStudy {
  const { total = 0, completed = 0 } = counts ?? {}
  return {
    participantCount: total,
    completedCount: completed,
    completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
  }
}

function getDefaultCounts(): EnrichedStudy {
  return { participantCount: 0, completedCount: 0, completionRate: 0 }
}
