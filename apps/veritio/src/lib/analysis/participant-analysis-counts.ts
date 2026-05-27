import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@veritio/study-types'

type SupabaseClientType = SupabaseClient<Database>

export interface ParticipantAnalysisCounts {
  participant_count: number
  excluded_participant_count: number
  analysis_included_participant_count: number
}

export interface StudyParticipantCountsInput {
  participant_count: number
  excluded_participant_count?: number | null
}

export function getParticipantAnalysisCounts(
  participantCount: number,
  excludedParticipantCount: number
): ParticipantAnalysisCounts {
  const total = Math.max(0, participantCount)
  const excluded = Math.min(Math.max(0, excludedParticipantCount), total)

  return {
    participant_count: total,
    excluded_participant_count: excluded,
    analysis_included_participant_count: total - excluded,
  }
}

export function getAnalysisIncludedParticipantCount(
  study: StudyParticipantCountsInput
): number {
  return (
    study.participant_count -
    Math.min(
      Math.max(0, study.excluded_participant_count ?? 0),
      study.participant_count
    )
  )
}

export async function getExcludedParticipantCountsByStudyId(
  supabase: SupabaseClientType,
  studyIds: string[]
): Promise<Map<string, number>> {
  if (studyIds.length === 0) return new Map()

  const { data, error } = await supabase
    .from('participant_analysis_flags')
    .select('study_id, participant_id')
    .in('study_id', studyIds)
    .eq('is_excluded', true)

  if (error) {
    console.error('Error fetching excluded participant counts:', error.message)
    return new Map()
  }

  const participantIdsByStudyId = new Map<string, Set<string>>()

  for (const row of data ?? []) {
    if (!row.study_id || !row.participant_id) continue

    const ids = participantIdsByStudyId.get(row.study_id) ?? new Set<string>()
    ids.add(row.participant_id)
    participantIdsByStudyId.set(row.study_id, ids)
  }

  return new Map(
    [...participantIdsByStudyId.entries()].map(([studyId, participantIds]) => [
      studyId,
      participantIds.size,
    ])
  )
}
