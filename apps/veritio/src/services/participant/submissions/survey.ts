/**
 * Survey completion service.
 * Handles survey participation completion.
 * Note: Survey responses are submitted via flow-responses API,
 * this service just marks the participation as complete.
 */
import type { SubmissionResult } from '../types'
import { verifyParticipantSession, markParticipantCompleted, type SupabaseClientType } from './verification'

// ============================================================================
// Types
// ============================================================================

export interface SurveyCompletionInput {
  sessionToken: string
  totalTimeMs?: number | null
  demographicData?: any | null
}

// ============================================================================
// Completion Handler
// ============================================================================

/**
 * Complete a survey study participation.
 * Survey responses are submitted via flow-responses API, this just marks completion.
 * Supports both share_code and custom url_slug.
 */
export async function completeSurveyParticipation(
  supabase: SupabaseClientType,
  shareCodeOrSlug: string,
  input: SurveyCompletionInput
): Promise<SubmissionResult> {
  const { study, participant, error } = await verifyParticipantSession(
    supabase,
    shareCodeOrSlug,
    input.sessionToken,
    'survey'
  )

  if (error) {
    return { success: false, error }
  }

  await markParticipantCompleted(supabase, participant.id, {
    demographic_data: input.demographicData || null,
  })

  return { success: true, studyId: study.id, participantId: participant.id, error: null }
}
