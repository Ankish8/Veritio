import { toJson } from '../../../lib/supabase/json-utils'
import type { SubmissionResult } from '../types'
import { verifyParticipantSession, markParticipantCompleted, type SupabaseClientType } from './verification'

export interface LiveWebsiteResponseInput {
  taskId: string
  status: 'completed' | 'abandoned' | 'timed_out' | 'skipped'
  startedAt: string | null
  completedAt: string | null
  durationMs: number | null
  completionMethod?: 'auto_url' | 'auto_url_direct' | 'auto_url_indirect' | 'auto_path' | 'auto_path_direct' | 'auto_path_indirect' | 'self_reported' | 'skip' | 'abandon' | 'timeout' | null
  postTaskResponses?: Array<{
    questionId: string
    value: unknown
  }>
}

export interface LiveWebsiteSubmissionInput {
  sessionToken: string
  responses: LiveWebsiteResponseInput[]
  demographicData?: Record<string, unknown> | null
  variantId?: string | null
}

export async function submitLiveWebsiteResponse(
  supabase: SupabaseClientType,
  shareCodeOrSlug: string,
  input: LiveWebsiteSubmissionInput,
  logger?: { info: (msg: string, data?: Record<string, unknown>) => void; warn: (msg: string, data?: Record<string, unknown>) => void; error: (msg: string, data?: Record<string, unknown>) => void },
  companionSubmitted?: boolean,
): Promise<SubmissionResult> {
  const { study, participant, error } = await verifyParticipantSession(
    supabase,
    shareCodeOrSlug,
    input.sessionToken,
    'live_website_test'
  )

  if (error) {
    // If already completed (e.g. companion widget submitted via snippet endpoint)
    // but we have demographic data, still update the participant metadata
    if (error.message === 'Response already submitted' && input.demographicData) {
      try {
        const { data: part } = await supabase
          .from('participants')
          .select('id, study_id, metadata')
          .eq('session_token', input.sessionToken)
          .single()
        if (part) {
          const existing = (part.metadata as Record<string, unknown>) || {}
          await supabase
            .from('participants')
            .update({ metadata: { ...existing, demographic_data: input.demographicData } as unknown as import('@/lib/supabase/types').Json })
            .eq('id', part.id)
          return { success: true, studyId: part.study_id, participantId: part.id, error: null }
        }
      } catch { /* silent - best effort */ }
      return { success: true, error: null }
    }
    return { success: false, error }
  }

  // When companionSubmitted=true (recording-controller mode), the companion script
  // handles task submission via /api/snippet/:snippetId/submit. The player only
  // needs to save demographics — don't insert empty responses or mark completed here.
  // The companion will mark the participant completed when it submits.
  if (companionSubmitted) {
    // Only update demographics metadata if provided
    if (input.demographicData) {
      const { data: existing } = await supabase
        .from('participants')
        .select('metadata')
        .eq('id', participant.id)
        .single()
      const existingMetadata = (existing?.metadata as Record<string, unknown>) || {}
      await supabase
        .from('participants')
        .update({ metadata: { ...existingMetadata, demographic_data: input.demographicData } as unknown as import('@/lib/supabase/types').Json })
        .eq('id', participant.id)
    }
    return { success: true, studyId: study.id, participantId: participant.id, error: null }
  }

  // Build response rows
  const responseRows = input.responses.map(r => ({
    participant_id: participant.id,
    task_id: r.taskId,
    study_id: study.id,
    status: r.status,
    started_at: r.startedAt,
    completed_at: r.completedAt,
    duration_ms: r.durationMs,
    completion_method: r.completionMethod || null,
    ...(input.variantId ? { variant_id: input.variantId } : {}),
  }))

  if (responseRows.length > 0) {
    const { data: insertedRows, error: insertError } = await (supabase
      .from('live_website_responses' as any) as any)
      .insert(responseRows)
      .select('id, task_id')

    if (insertError) {
      logger?.error('Failed to insert live website responses', { error: insertError })
      return { success: false, error: new Error('Failed to save responses') }
    }

    // Build task_id → response_id map for linking post-task responses
    const taskToResponseId = new Map(
      (insertedRows || []).map((r: { id: string; task_id: string }) => [r.task_id, r.id])
    )

    // Batch insert post-task responses
    const postTaskRows = input.responses
      .filter(r => r.postTaskResponses?.length)
      .flatMap(response => {
        const responseId = taskToResponseId.get(response.taskId)
        if (!responseId) return []
        return response.postTaskResponses!.map(ptr => ({
          response_id: responseId,
          study_id: study.id,
          participant_id: participant.id,
          task_id: response.taskId,
          question_id: ptr.questionId,
          value: toJson(ptr.value),
        }))
      })

    if (postTaskRows.length > 0) {
      const { error: postTaskError } = await (supabase
        .from('live_website_post_task_responses' as any) as any)
        .insert(postTaskRows)

      if (postTaskError) {
        // Log but don't fail - post-task responses are supplementary data
        logger?.error('Failed to insert live website post-task responses', { error: postTaskError })
      }
    }
  }

  await markParticipantCompleted(
    supabase,
    participant.id,
    input.demographicData ? { demographic_data: input.demographicData } : undefined,
    logger
  )

  return { success: true, studyId: study.id, participantId: participant.id, error: null }
}
