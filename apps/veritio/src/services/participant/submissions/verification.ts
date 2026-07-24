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

export async function markParticipantCompleted(
  supabase: SupabaseClientType,
  participantId: string,
  metadata?: Record<string, unknown>,
  logger?: { info: (msg: string, data?: Record<string, unknown>) => void; warn: (msg: string, data?: Record<string, unknown>) => void; error: (msg: string, data?: Record<string, unknown>) => void },
  knownStudyId?: string
): Promise<void> {
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
      throw new Error('Failed to mark participant as completed: Participant not found')
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
    throw new Error(`Failed to mark participant as completed: ${error.message}`)
  }

  if (result === 'response_limit_reached') {
    logger?.warn('[markParticipantCompleted] Response limit reached', {
      participantId,
      studyId,
      cap,
    })
    throw new Error('This study has reached its response limit')
  }

  if (result === 'already_completed') {
    throw new Error('Response already submitted')
  }

  if (result !== 'completed') {
    logger?.error('[markParticipantCompleted] Unexpected completion result', {
      participantId,
      result,
    })
    throw new Error('Failed to mark participant as completed')
  }
}
