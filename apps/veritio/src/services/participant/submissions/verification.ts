import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@veritio/study-types'

export type SupabaseClientType = SupabaseClient<Database>

export type VerifyResult =
  | { study: { id: string }; participant: { id: string }; error: null }
  | { study: null; participant: null; error: Error }

export async function verifyParticipantSession(
  supabase: SupabaseClientType,
  shareCodeOrSlug: string,
  sessionToken: string,
  studyTypeFilter?: string
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

  if (participantData.status === 'completed') {
    return { study: null, participant: null, error: new Error('Response already submitted') }
  }

  return { study: { id: studyData.id }, participant: { id: participantData.id }, error: null }
}

export async function markParticipantCompleted(
  supabase: SupabaseClientType,
  participantId: string,
  metadata?: Record<string, unknown>,
  logger?: { info: (msg: string, data?: Record<string, unknown>) => void; warn: (msg: string, data?: Record<string, unknown>) => void; error: (msg: string, data?: Record<string, unknown>) => void }
): Promise<void> {
  let finalMetadata = metadata
  if (metadata) {
    const { data: existing } = await supabase
      .from('participants')
      .select('metadata')
      .eq('id', participantId)
      .single()

    const existingMetadata = (existing?.metadata as Record<string, unknown>) || {}
    finalMetadata = { ...existingMetadata, ...metadata }
  }

  const updateData: Record<string, unknown> = {
    status: 'completed',
    completed_at: new Date().toISOString(),
  }

  if (finalMetadata) {
    updateData.metadata = finalMetadata
  }

  const { error } = await supabase
    .from('participants')
    .update(updateData)
    .eq('id', participantId)

  if (error) {
    logger?.error('[markParticipantCompleted] Failed to update participant', {
      participantId,
      error: error.message,
    })
    throw new Error(`Failed to mark participant as completed: ${error.message}`)
  }
}
