import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@veritio/study-types'

type SupabaseClientType = SupabaseClient<Database>

export interface ParticipantStats {
  completedCount: number
  inProgressCount: number
  abandonedCount: number
  totalCount: number
}

async function calculateStudyStatsFallback(
  supabase: SupabaseClientType,
  studyId: string
): Promise<ParticipantStats> {
  const [completed, inProgress, abandoned] = await Promise.all([
    supabase
      .from('participants')
      .select('*', { count: 'exact', head: true })
      .eq('study_id', studyId)
      .eq('status', 'completed'),
    supabase
      .from('participants')
      .select('*', { count: 'exact', head: true })
      .eq('study_id', studyId)
      .eq('status', 'in_progress'),
    supabase
      .from('participants')
      .select('*', { count: 'exact', head: true })
      .eq('study_id', studyId)
      .eq('status', 'abandoned'),
  ])

  return {
    completedCount: completed.count || 0,
    inProgressCount: inProgress.count || 0,
    abandonedCount: abandoned.count || 0,
    totalCount: (completed.count || 0) + (inProgress.count || 0) + (abandoned.count || 0),
  }
}

export async function calculateStudyStats(
  supabase: SupabaseClientType,
  studyId: string
): Promise<ParticipantStats> {
  const { data, error } = await (supabase.rpc as any)('get_participant_stats', {
    p_study_id: studyId,
  })

  if (error || !data) {
    return calculateStudyStatsFallback(supabase, studyId)
  }

  const stats: ParticipantStats = {
    completedCount: 0,
    inProgressCount: 0,
    abandonedCount: 0,
    totalCount: 0,
  }

  ;(data as Array<{ status: string; count: number }>).forEach((row) => {
    const count = Number(row.count || 0)
    stats.totalCount += count

    if (row.status === 'completed') stats.completedCount = count
    if (row.status === 'in_progress') stats.inProgressCount = count
    if (row.status === 'abandoned') stats.abandonedCount = count
  })

  return stats
}

export function calculateProgress(completedCount: number, targetCount?: number): number | null {
  if (!targetCount || targetCount <= 0) return null
  return Math.round((completedCount / targetCount) * 100)
}
