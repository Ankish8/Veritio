import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@veritio/study-types'
import { getResponseCapForStudy } from '../../entitlements-service'

export type SupabaseClientType = SupabaseClient<Database>

export type VerifyResult =
  | { study: { id: string }; participant: { id: string; status: string }; error: null }
  | { study: null; participant: null; error: Error }

export interface VerifyParticipantSessionOptions {
  allowCompleted?: boolean
}

export async function verifyParticipantSession(
  supabase: SupabaseClientType,
  shareCodeOrSlug: string,
  sessionToken: string,
  studyTypeFilter?: string,
  options: VerifyParticipantSessionOptions = {}
): Promise<VerifyResult> {
  let studySelect = 'id, status'
  if (studyTypeFilter) {
    studySelect += ', study_type'
  }

  const { data: study, error: studyError } = await supabase
    .from('studies')
    .select(studySelect)
    .or(`share_code.eq.${shareCodeOrSlug},url_slug.eq.${shareCodeOrSlug}`)
    .single()

  if (studyError || !study) {
    return { study: null, participant: null, error: new Error('Study not found') }
  }

  if (studyTypeFilter && (study as any).study_type !== studyTypeFilter) {
    return { study: null, participant: null, error: new Error(`This endpoint is only for ${studyTypeFilter} studies`) }
  }

  const studyData = study as unknown as { id: string; status: string; study_type?: string }

  const { data: participant, error: participantError } = await supabase
    .from('participants')
    .select('id, status')
    .eq('session_token', sessionToken)
    .eq('study_id', studyData.id)
    .single()

  if (participantError || !participant) {
    return { study: null, participant: null, error: new Error('Invalid session') }
  }

  const participantData = participant as { id: string; status: string }

  if (participantData.status === 'completed' && !options.allowCompleted) {
    return { study: null, participant: null, error: new Error('Response already submitted') }
  }

  return { study: { id: studyData.id }, participant: { id: participantData.id, status: participantData.status }, error: null }
}

export interface SubmissionLogger {
  info: (msg: string, data?: Record<string, unknown>) => void
  warn: (msg: string, data?: Record<string, unknown>) => void
  error: (msg: string, data?: Record<string, unknown>) => void
}

export type CompletionOutcome =
  | 'completed'
  | 'already_completed'
  | 'response_limit_reached'
  | 'not_found'
  | 'failed'

export interface CompletionResult {
  outcome: CompletionOutcome
  /** Participant-facing error for every outcome other than 'completed'. */
  error: Error | null
}

// The steps map these exact strings onto status codes, so they are declared once.
export const ALREADY_SUBMITTED_ERROR = 'Response already submitted'
export const RESPONSE_LIMIT_ERROR = 'This study has reached its response limit'
export const COMPLETION_FAILED_ERROR = 'Could not record your submission. Please try again.'

/**
 * Complete a participant, honouring the study's response cap.
 *
 * Returns the outcome instead of throwing. Throwing meant a full response cap —
 * an ordinary, expected outcome — escaped the callers' error mapping and reached
 * the participant as a bare 500, and it made a failure here indistinguishable
 * from a bug.
 */
export async function markParticipantCompleted(
  supabase: SupabaseClientType,
  participantId: string,
  metadata?: Record<string, unknown>,
  logger?: SubmissionLogger,
  knownStudyId?: string
): Promise<CompletionResult> {
  try {
    let studyId = knownStudyId
    if (!studyId) {
      const { data: participant, error: participantError } = await supabase
        .from('participants')
        .select('study_id')
        .eq('id', participantId)
        .single()

      if (participantError || !participant) {
        logger?.error('[markParticipantCompleted] Participant not found', {
          participantId,
          error: participantError?.message,
        })
        return { outcome: 'not_found', error: new Error('Invalid session') }
      }
      studyId = participant.study_id as string
    }

    const cap = await getResponseCapForStudy(supabase, studyId)
    const { data: result, error } = await (supabase as any).rpc('complete_participant_if_under_response_cap', {
      p_participant_id: participantId,
      p_response_cap: cap === Infinity ? null : cap,
      p_metadata: metadata ?? null,
    })

    if (error) {
      logger?.error('[markParticipantCompleted] Failed to update participant', {
        participantId,
        error: error.message,
      })
      return { outcome: 'failed', error: new Error(COMPLETION_FAILED_ERROR) }
    }

    if (result === 'response_limit_reached') {
      logger?.warn('[markParticipantCompleted] Response limit reached', {
        participantId,
        studyId,
        cap,
      })
      return { outcome: 'response_limit_reached', error: new Error(RESPONSE_LIMIT_ERROR) }
    }

    if (result === 'already_completed') {
      return { outcome: 'already_completed', error: new Error(ALREADY_SUBMITTED_ERROR) }
    }

    if (result === 'not_found') {
      logger?.error('[markParticipantCompleted] Participant not found by RPC', { participantId })
      return { outcome: 'not_found', error: new Error('Invalid session') }
    }

    if (result !== 'completed') {
      logger?.error('[markParticipantCompleted] Unexpected completion result', {
        participantId,
        result,
      })
      return { outcome: 'failed', error: new Error(COMPLETION_FAILED_ERROR) }
    }

    return { outcome: 'completed', error: null }
  } catch (unexpected) {
    logger?.error('[markParticipantCompleted] Unexpected failure', {
      participantId,
      error: unexpected instanceof Error ? unexpected.message : String(unexpected),
    })
    return { outcome: 'failed', error: new Error(COMPLETION_FAILED_ERROR) }
  }
}

export interface CompleteSubmissionOptions {
  metadata?: Record<string, unknown>
  logger?: SubmissionLogger
  /**
   * Tables holding the rows this submission just wrote, all keyed by
   * participant_id. If completion fails they are cleared so a failed submit
   * cannot leave behind a response that the analysis counts (card sort results,
   * for one, read every response row regardless of participant status) against
   * a participant who never completed. Child rows come with them via ON DELETE
   * CASCADE.
   *
   * Omit for study types whose answers accumulate during the session (survey,
   * live website): there the stored rows are real data, not an artefact of this
   * one request.
   */
  rollbackTables?: readonly string[]
}

/**
 * Complete a participant as the last step of a submission, undoing the rows this
 * request wrote if that fails. Returns null on success, or the participant-facing
 * error to report.
 */
export async function completeParticipantSubmission(
  supabase: SupabaseClientType,
  participantId: string,
  studyId: string,
  options: CompleteSubmissionOptions = {}
): Promise<Error | null> {
  const { metadata, logger, rollbackTables } = options

  const { outcome, error } = await markParticipantCompleted(
    supabase,
    participantId,
    metadata,
    logger,
    studyId
  )

  if (outcome === 'completed') return null

  for (const table of rollbackTables ?? []) {
    const { error: rollbackError } = await (supabase.from(table as any) as any)
      .delete()
      .eq('participant_id', participantId)

    if (rollbackError) {
      // Leaves an orphaned response row. Logged loudly because it needs cleaning
      // up by hand; failing the request twice would not help the participant.
      logger?.error('[completeParticipantSubmission] Failed to roll back response rows', {
        participantId,
        studyId,
        table,
        outcome,
        error: rollbackError.message,
      })
    }
  }

  return error ?? new Error(COMPLETION_FAILED_ERROR)
}
