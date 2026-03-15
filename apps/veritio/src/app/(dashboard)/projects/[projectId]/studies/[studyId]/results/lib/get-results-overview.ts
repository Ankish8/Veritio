import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Study } from '@veritio/study-types'

export interface ResultsOverviewData {
  study: Study
  projectName: string
  responseCount: number
  completionRate: number
  hasResponses: boolean
}

export async function getResultsOverview(
  supabase: SupabaseClient<Database>,
  studyId: string
): Promise<ResultsOverviewData> {
  // Fetch study and response count in parallel (fast queries)
  const [studyResult, projectResult, responseCountResult] = await Promise.all([
    supabase.from('studies').select('*').eq('id', studyId).single(),
    supabase
      .from('studies')
      .select('projects(id, name)')
      .eq('id', studyId)
      .single()
      .then((r) => r.data?.projects as { id: string; name: string } | null),
    getResponseCount(supabase, studyId),
  ])

  if (studyResult.error || !studyResult.data) {
    throw new Error('Study not found or access denied')
  }

  const study = studyResult.data
  const projectName = projectResult?.name || 'Project'
  const responseCount = responseCountResult.total
  const completionRate = responseCountResult.completed / (responseCount || 1)
  const hasResponses = responseCount > 0

  return {
    study,
    projectName,
    responseCount,
    completionRate,
    hasResponses,
  }
}

async function getResponseCount(
  supabase: SupabaseClient<Database>,
  studyId: string
): Promise<{ total: number; completed: number }> {
  // Query participants table (all studies use this)
  const { data: participants } = await supabase
    .from('participants')
    .select('id, status')
    .eq('study_id', studyId)

  const total = participants?.length || 0
  const completed = participants?.filter(p => p.status === 'completed').length || 0

  return {
    total,
    completed,
  }
}
