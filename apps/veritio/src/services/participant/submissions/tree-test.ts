/**
 * Tree Test submission service.
 * Handles tree test response submissions from participants.
 */
import type { TreeTestResponseInsert, Json } from '@veritio/study-types'
import { toJson } from '../../../lib/supabase/json-utils'
import type { SubmissionResult } from '../types'
import { verifyParticipantSession, markParticipantCompleted, type SupabaseClientType } from './verification'

// ============================================================================
// Types
// ============================================================================

/**
 * Post-task question response from participant
 */
export interface PostTaskQuestionResponseInput {
  questionId: string
  value: unknown // ResponseValue - string | number | boolean | string[]
}

export interface TreeTestSubmissionInput {
  sessionToken: string
  responses: Array<{
    taskId: string
    pathTaken: string[]
    selectedNodeId: string | null
    timeToFirstClickMs?: number | null
    totalTimeMs?: number | null
    skipped?: boolean
    postTaskResponses?: PostTaskQuestionResponseInput[]
  }>
  demographicData?: Record<string, unknown> | null
}

// ============================================================================
// Submission Handler
// ============================================================================

/**
 * Submit tree test responses.
 * Supports both share_code and custom url_slug.
 */
export async function submitTreeTestResponse(
  supabase: SupabaseClientType,
  shareCodeOrSlug: string,
  input: TreeTestSubmissionInput,
  logger?: { info: (msg: string, data?: Record<string, unknown>) => void; warn: (msg: string, data?: Record<string, unknown>) => void; error: (msg: string, data?: Record<string, unknown>) => void }
): Promise<SubmissionResult> {
  const { study, participant, error } = await verifyParticipantSession(
    supabase,
    shareCodeOrSlug,
    input.sessionToken
  )

  if (error) {
    return { success: false, error }
  }

  // Get tasks to check correctness (supports both single correct_node_id and multi correct_node_ids)
  const { data: tasks } = await supabase
    .from('tasks')
    .select('id, correct_node_id, correct_node_ids')
    .eq('study_id', study.id)

  // Build task map with correct node IDs array (supports both old and new format)
  const taskMap = new Map(
    tasks?.map((t) => {
      const correctIds = (t.correct_node_ids as string[] | null)?.length
        ? (t.correct_node_ids as string[])
        : t.correct_node_id
          ? [t.correct_node_id]
          : []
      return [t.id, correctIds]
    }) || []
  )

  // Save tree test responses
  const responseData: TreeTestResponseInsert[] = input.responses.map((r) => {
    const correctNodeIds = taskMap.get(r.taskId) || []
    const isSkipped = r.skipped === true
    const isCorrect = isSkipped ? null : (
      correctNodeIds.length > 0 && r.selectedNodeId
        ? correctNodeIds.includes(r.selectedNodeId)
        : null
    )
    const pathLength = r.pathTaken.length
    const isDirectPath = pathLength <= 2

    return {
      participant_id: participant.id,
      study_id: study.id,
      task_id: r.taskId,
      path_taken: r.pathTaken,
      selected_node_id: r.selectedNodeId,
      is_correct: isCorrect,
      is_direct: isDirectPath,
      is_skipped: isSkipped,
      time_to_first_click_ms: r.timeToFirstClickMs || null,
      total_time_ms: r.totalTimeMs || null,
      backtrack_count: 0,
    }
  })

  const { data: insertedResponses, error: responseError } = await supabase
    .from('tree_test_responses')
    .insert(responseData)
    .select('id, task_id')

  if (responseError || !insertedResponses) {
    return { success: false, error: new Error('Failed to save responses') }
  }

  // Build a map of taskId -> responseId for linking post-task responses
  const responseIdMap = new Map(
    insertedResponses.map((r) => [r.task_id, r.id])
  )

  // Collect all post-task responses to insert
  const postTaskResponseData: Array<{
    tree_test_response_id: string
    study_id: string
    participant_id: string
    task_id: string
    question_id: string
    value: Json
  }> = []

  for (const r of input.responses) {
    if (r.postTaskResponses && r.postTaskResponses.length > 0) {
      const responseId = responseIdMap.get(r.taskId)
      if (responseId) {
        for (const ptr of r.postTaskResponses) {
          postTaskResponseData.push({
            tree_test_response_id: responseId,
            study_id: study.id,
            participant_id: participant.id,
            task_id: r.taskId,
            question_id: ptr.questionId,
            value: toJson(ptr.value),
          })
        }
      }
    }
  }

  // Insert post-task responses if any exist
  if (postTaskResponseData.length > 0) {
    const { error: postTaskError } = await supabase
      .from('tree_test_post_task_responses')
      .insert(postTaskResponseData)

    if (postTaskError) {
      // Log but don't fail - post-task responses are supplementary data
      // The main tree test responses are already saved
      logger?.error('Failed to insert post-task responses', { error: postTaskError })
    }
  }

  // Store demographic data in participant metadata (same format as other study types)
  await markParticipantCompleted(
    supabase,
    participant.id,
    input.demographicData ? { demographic_data: input.demographicData } : undefined,
    logger
  )

  return { success: true, studyId: study.id, participantId: participant.id, error: null }
}
