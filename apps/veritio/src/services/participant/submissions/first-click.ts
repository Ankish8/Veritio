/**
 * First-Click Test submission service.
 * Handles first-click test response submissions including:
 * - Click coordinates and timing
 * - AOI matching
 * - Post-task responses
 */
import { toJson } from '../../../lib/supabase/json-utils'
import type { SubmissionResult } from '../types'
import { verifyParticipantSession, markParticipantCompleted, type SupabaseClientType } from './verification'

// ============================================================================
// Types
// ============================================================================

export interface FirstClickResponseInput {
  taskId: string
  click?: {
    x: number
    y: number
    timeToClickMs: number
    viewportWidth: number
    viewportHeight: number
    imageRenderedWidth: number
    imageRenderedHeight: number
    isCorrect: boolean
    matchedAoiId: string | null
  }
  skipped: boolean
  postTaskResponses?: Array<{
    questionId: string
    value: unknown
  }>
}

export interface FirstClickSubmissionInput {
  sessionToken: string
  responses: FirstClickResponseInput[]
  demographicData?: Record<string, unknown> | null
}

// ============================================================================
// Submission Handler
// ============================================================================

/**
 * Submit first-click test responses.
 * Records click data, matched AOIs, and post-task responses.
 * Supports both share_code and custom url_slug.
 */
export async function submitFirstClickResponse(
  supabase: SupabaseClientType,
  shareCodeOrSlug: string,
  input: FirstClickSubmissionInput,
  logger?: { info: (msg: string, data?: Record<string, unknown>) => void; warn: (msg: string, data?: Record<string, unknown>) => void; error: (msg: string, data?: Record<string, unknown>) => void }
): Promise<SubmissionResult> {
  const { study, participant, error } = await verifyParticipantSession(
    supabase,
    shareCodeOrSlug,
    input.sessionToken,
    'first_click'
  )

  if (error) {
    return { success: false, error }
  }

  // Fetch task -> image ID mappings in a single query
  const taskIds = input.responses.map(r => r.taskId)
  let taskImageMap = new Map<string, string | undefined>()
  if (taskIds.length > 0) {
    const { data: tasks } = await supabase
      .from('first_click_tasks')
      .select('id, image:first_click_images(id)')
      .in('id', taskIds)

    taskImageMap = new Map(
      tasks?.map(t => [t.id, Array.isArray(t.image) ? t.image[0]?.id : (t.image as any)?.id]) || []
    )
  }

  // Build all click response rows (both clicks and skips)
  const clickRows = input.responses
    .filter(r => r.click || r.skipped)
    .map(response => {
      const imageId = taskImageMap.get(response.taskId) ?? null
      const base = {
        participant_id: participant.id,
        task_id: response.taskId,
        study_id: study.id,
        image_id: imageId as string,
      }
      if (response.click) {
        return {
          ...base,
          click_x: response.click.x,
          click_y: response.click.y,
          time_to_click_ms: response.click.timeToClickMs,
          is_correct: response.click.isCorrect,
          matched_aoi_id: response.click.matchedAoiId,
          is_skipped: response.skipped,
          viewport_width: response.click.viewportWidth,
          viewport_height: response.click.viewportHeight,
          image_rendered_width: response.click.imageRenderedWidth,
          image_rendered_height: response.click.imageRenderedHeight,
        }
      }
      // Skipped response (no click data)
      return {
        ...base,
        is_skipped: true as const,
        click_x: null,
        click_y: null,
        time_to_click_ms: null,
        is_correct: null,
        matched_aoi_id: null,
      }
    })

  // Batch insert all click responses and get IDs back
  if (clickRows.length > 0) {
    const { data: insertedRows, error: clickError } = await supabase
      .from('first_click_responses')
      .insert(clickRows)
      .select('id, task_id')

    if (clickError) {
      logger?.error('Failed to insert first-click responses', { error: clickError })
      return { success: false, error: new Error('Failed to save click responses') }
    }

    // Build a task_id -> response_id map for linking post-task responses
    const taskToResponseId = new Map(
      (insertedRows || []).map(r => [r.task_id, r.id])
    )

    // Batch insert all post-task responses
    const postTaskRows = input.responses
      .filter(r => r.click && r.postTaskResponses?.length)
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
      const { error: postTaskError } = await supabase
        .from('first_click_post_task_responses')
        .insert(postTaskRows)

      if (postTaskError) {
        // Log but don't fail - post-task responses are supplementary data
        logger?.error('Failed to insert first-click post-task responses', { error: postTaskError })
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
