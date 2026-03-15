import type { SupabaseClient } from '@supabase/supabase-js'

export interface ExclusionResult {
  success: boolean
  updatedCount: number
  error?: string
}

/**
 * Toggle exclusion status for one or more participants in a study.
 *
 * Handles both single and bulk cases (single = array of 1).
 * - Verifies all supplied IDs belong to the study, silently drops invalid ones.
 * - Returns an error result if the filtered list is empty after validation.
 * - Upserts flags: updates `is_excluded` on existing rows; inserts new rows
 *   only when `exclude` is true (no-op for flag removal on rows that don't exist).
 */
export async function toggleParticipantExclusion(
  supabase: SupabaseClient,
  studyId: string,
  participantIds: string[],
  exclude: boolean,
  reason?: string,
): Promise<ExclusionResult> {
  if (participantIds.length === 0) {
    return { success: false, updatedCount: 0, error: 'No participant IDs provided' }
  }

  // Verify all participants belong to this study
  const { data: validParticipants, error: verifyError } = await supabase
    .from('participants')
    .select('id')
    .eq('study_id', studyId)
    .in('id', participantIds)

  if (verifyError) {
    return { success: false, updatedCount: 0, error: 'Failed to verify participants' }
  }

  const validIds = new Set((validParticipants || []).map((p: { id: string }) => p.id))
  const filteredIds = participantIds.filter(id => validIds.has(id))

  if (filteredIds.length === 0) {
    return { success: false, updatedCount: 0, error: 'No valid participants found for this study' }
  }

  // Check which participants already have flag rows
  const { data: existingFlags, error: flagsError } = await supabase
    .from('participant_analysis_flags')
    .select('participant_id')
    .eq('study_id', studyId)
    .in('participant_id', filteredIds)

  if (flagsError) {
    return { success: false, updatedCount: 0, error: 'Failed to update exclusion status' }
  }

  const idsWithFlags = new Set((existingFlags || []).map((f: { participant_id: string }) => f.participant_id))
  const idsToUpdate = filteredIds.filter(id => idsWithFlags.has(id))
  const idsWithoutFlags = filteredIds.filter(id => !idsWithFlags.has(id))

  // Update existing flag rows
  if (idsToUpdate.length > 0) {
    const { error: updateError } = await supabase
      .from('participant_analysis_flags')
      .update({ is_excluded: exclude })
      .eq('study_id', studyId)
      .in('participant_id', idsToUpdate)

    if (updateError) {
      return { success: false, updatedCount: 0, error: 'Failed to update exclusion status' }
    }
  }

  // Insert new flag rows only when excluding (no-op when un-excluding with no existing row)
  if (exclude && idsWithoutFlags.length > 0) {
    const flagReason = reason ?? 'Manually excluded by researcher'
    const newFlags = idsWithoutFlags.map(participantId => ({
      participant_id: participantId,
      study_id: studyId,
      flag_type: 'no_movement' as const,
      flag_reason: flagReason,
      is_excluded: true,
    }))

    const { error: insertError } = await supabase
      .from('participant_analysis_flags')
      .insert(newFlags)

    if (insertError) {
      return { success: false, updatedCount: 0, error: 'Failed to update exclusion status' }
    }
  }

  return { success: true, updatedCount: filteredIds.length }
}
