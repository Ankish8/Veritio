/**
 * Card Sort submission service.
 * Handles card sort response submissions from participants.
 */
import type { CardSortResponseInsert } from '@veritio/study-types'
import { toJson, toJsonNullable } from '../../../lib/supabase/json-utils'
import type { SubmissionResult } from '../types'
import { verifyParticipantSession, markParticipantCompleted, type SupabaseClientType } from './verification'

// ============================================================================
// Types
// ============================================================================

export interface CardSortSubmissionInput {
  sessionToken: string
  cardPlacements: Record<string, string[]>
  customCategories?: string[] | null
  totalTimeMs?: number | null
  demographicData?: Record<string, unknown> | null
}

// ============================================================================
// Submission Handler
// ============================================================================

/**
 * Submit a card sort response.
 * Supports both share_code and custom url_slug.
 */
export async function submitCardSortResponse(
  supabase: SupabaseClientType,
  shareCodeOrSlug: string,
  input: CardSortSubmissionInput
): Promise<SubmissionResult> {
  const { study, participant, error } = await verifyParticipantSession(
    supabase,
    shareCodeOrSlug,
    input.sessionToken
  )

  if (error) {
    return { success: false, error }
  }

  // Save card sort response
  const responseData: CardSortResponseInsert = {
    participant_id: participant.id,
    study_id: study.id,
    card_placements: toJson(input.cardPlacements),
    custom_categories: toJsonNullable(input.customCategories),
    total_time_ms: input.totalTimeMs || null,
  }

  const { error: responseError } = await supabase
    .from('card_sort_responses')
    .insert(responseData)

  if (responseError) {
    return { success: false, error: new Error('Failed to save response') }
  }

  // Store demographic data in participant metadata (same format as other study types)
  await markParticipantCompleted(
    supabase,
    participant.id,
    input.demographicData ? { demographic_data: input.demographicData } : undefined
  )

  return { success: true, studyId: study.id, participantId: participant.id, error: null }
}
