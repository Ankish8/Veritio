/**
 * Prototype Test submission service.
 * Handles prototype test response submissions including:
 * - Task attempts with outcomes
 * - Click events tracking
 * - Navigation events tracking
 * - Post-task responses
 */
import type { Json } from '@veritio/study-types'
import { toJson, toJsonNullable } from '../../../lib/supabase/json-utils'
import type { SubmissionResult } from '../types'
import { verifyParticipantSession, markParticipantCompleted, type SupabaseClientType } from './verification'

// ============================================================================
// Types
// ============================================================================

export interface PrototypeTestSubmissionInput {
  sessionToken: string
  taskAttempts: Array<{
    taskId: string
    taskAttemptId?: string | null  // Client-generated UUID for linking recordings
    outcome: 'success' | 'failure' | 'abandoned' | 'skipped'
    pathTaken: string[]
    isDirect?: boolean
    totalTimeMs?: number
    timeToFirstClickMs?: number
    clickCount?: number
    misclickCount?: number
    backtrackCount?: number
    postTaskResponses?: any
    successPathway?: any
  }>
  clickEvents?: Array<{
    taskId: string
    frameId: string
    timestamp: string
    x: number
    y: number
    viewportX?: number
    viewportY?: number
    wasHotspot?: boolean
    hotspotId?: string
    triggeredTransition?: boolean
    timeSinceFrameLoadMs?: number
    componentStates?: Record<string, string>
  }>
  navigationEvents?: Array<{
    taskId: string
    fromFrameId: string | null
    toFrameId: string
    triggeredBy: 'click' | 'back_button' | 'task_start' | 'timeout'
    clickEventId?: string
    timeOnFromFrameMs?: number
    sequenceNumber: number
    timestamp: string
  }>
  componentStateEvents?: Array<{
    taskId: string
    frameId: string | null
    componentNodeId: string
    fromVariantId: string | null
    toVariantId: string
    isTimedChange: boolean
    sequenceNumber: number
    timestamp: string
  }>
  demographicData?: Record<string, unknown> | null
}

// ============================================================================
// Submission Handler
// ============================================================================

/**
 * Submit prototype test responses.
 * Creates session, task attempts, and optionally click/navigation events.
 * Supports both share_code and custom url_slug.
 */
export async function submitPrototypeTestResponse(
  supabase: SupabaseClientType,
  shareCodeOrSlug: string,
  input: PrototypeTestSubmissionInput,
  logger?: { info: (msg: string, data?: Record<string, unknown>) => void; warn: (msg: string, data?: Record<string, unknown>) => void; error: (msg: string, data?: Record<string, unknown>) => void }
): Promise<SubmissionResult> {
  logger?.info('[PrototypeTestSubmission] Received submission', {
    shareCodeOrSlug,
    taskAttemptsCount: input.taskAttempts?.length ?? 0,
    taskAttemptIds: input.taskAttempts?.map(a => a.taskId) ?? [],
    hasSessionToken: !!input.sessionToken,
    clickEventsCount: input.clickEvents?.length ?? 0,
    navEventsCount: input.navigationEvents?.length ?? 0,
    componentStateEventsCount: input.componentStateEvents?.length ?? 0,
  })

  const { study, participant, error } = await verifyParticipantSession(
    supabase,
    shareCodeOrSlug,
    input.sessionToken,
    'prototype_test'
  )

  if (error) {
    logger?.info('[PrototypeTestSubmission] Session verification failed', { message: error.message })
    return { success: false, error }
  }

  // Calculate total time from all task attempts
  const totalTimeMs = input.taskAttempts.reduce(
    (sum, attempt) => sum + (attempt.totalTimeMs || 0),
    0
  )

  // Create or get prototype test session
  const { data: session, error: sessionError } = await supabase
    .from('prototype_test_sessions')
    .upsert(
      {
        study_id: study.id,
        participant_id: participant.id,
        completed_at: new Date().toISOString(),
        total_time_ms: totalTimeMs,
      },
      { onConflict: 'participant_id' }
    )
    .select('id')
    .single()

  if (sessionError || !session) {
    return { success: false, error: new Error('Failed to create session') }
  }

  const sessionId = session.id

  // Insert task attempts and get back IDs for linking post-task responses
  const taskAttemptData = input.taskAttempts.map((attempt) => ({
    session_id: sessionId,
    study_id: study.id,
    participant_id: participant.id,
    task_id: attempt.taskId,
    task_attempt_id: attempt.taskAttemptId || null, // Client-generated UUID for linking recordings
    outcome: attempt.outcome,
    path_taken: toJson(attempt.pathTaken),
    is_direct: attempt.isDirect ?? (attempt.pathTaken.length <= 2),
    total_time_ms: attempt.totalTimeMs || null,
    time_to_first_click_ms: attempt.timeToFirstClickMs || null,
    click_count: attempt.clickCount || 0,
    misclick_count: attempt.misclickCount || 0,
    backtrack_count: attempt.backtrackCount || 0,
    post_task_responses: toJsonNullable(attempt.postTaskResponses), // Keep JSONB for backwards compatibility
    success_pathway_snapshot: toJsonNullable(attempt.successPathway),
  }))

  logger?.info('[PrototypeTestSubmission] Inserting task attempts', {
    count: taskAttemptData.length,
    taskIds: taskAttemptData.map(d => d.task_id),
    sessionId,
    studyId: study.id,
    participantId: participant.id,
  })

  // Check for empty task attempts - this indicates a client-side bug
  if (taskAttemptData.length === 0) {
    logger?.error('[PrototypeTestSubmission] WARNING: No task attempts to insert! This is unexpected.')
  }

  // Only attempt insert if we have task attempts
  let insertedAttempts: { id: string; task_id: string }[] = []

  if (taskAttemptData.length > 0) {
    const { data, error: attemptError } = await supabase
      .from('prototype_test_task_attempts')
      .insert(taskAttemptData)
      .select('id, task_id')

    logger?.info('[PrototypeTestSubmission] Insert result', {
      insertedCount: data?.length ?? 0,
      expectedCount: taskAttemptData.length,
      error: attemptError?.message,
      errorCode: (attemptError as any)?.code,
      errorDetails: (attemptError as any)?.details,
    })

    if (attemptError) {
      logger?.error('[PrototypeTestSubmission] Failed to insert task attempts', {
        error: attemptError,
        taskAttemptData: taskAttemptData.map(d => ({ taskId: d.task_id, outcome: d.outcome })),
      })
      return { success: false, error: new Error(`Failed to save task attempts: ${attemptError.message}`) }
    }

    if (!data || data.length !== taskAttemptData.length) {
      logger?.error('[PrototypeTestSubmission] Mismatch in inserted rows', {
        expected: taskAttemptData.length,
        actual: data?.length ?? 0,
      })
      return { success: false, error: new Error('Failed to save all task attempts') }
    }

    insertedAttempts = data
  } else {
    // This is a bug - prototype test submissions should always have task attempts
    logger?.error('[PrototypeTestSubmission] BUG: No task attempts to insert! Client sent empty taskAttempts array.')
    return { success: false, error: new Error('No task attempts provided - this is a client bug') }
  }

  // Build a map of taskId -> attemptId for linking post-task responses
  const attemptIdMap = new Map(
    insertedAttempts.map((a) => [a.task_id, a.id])
  )

  // Collect all post-task responses to insert into normalized table
  const postTaskResponseData: Array<{
    task_attempt_id: string
    session_id: string
    study_id: string
    participant_id: string
    task_id: string
    question_id: string
    value: Json
  }> = []

  for (const attempt of input.taskAttempts) {
    if (attempt.postTaskResponses && Array.isArray(attempt.postTaskResponses) && attempt.postTaskResponses.length > 0) {
      const attemptId = attemptIdMap.get(attempt.taskId)
      if (attemptId) {
        for (const ptr of attempt.postTaskResponses) {
          postTaskResponseData.push({
            task_attempt_id: attemptId,
            session_id: sessionId,
            study_id: study.id,
            participant_id: participant.id,
            task_id: attempt.taskId,
            question_id: ptr.questionId,
            value: toJson(ptr.value),
          })
        }
      }
    }
  }

  // Insert post-task responses into normalized table if any exist
  if (postTaskResponseData.length > 0) {
    const { error: postTaskError } = await supabase
      .from('prototype_test_post_task_responses')
      .insert(postTaskResponseData)

    if (postTaskError) {
      // Log but don't fail - post-task responses are supplementary data
      logger?.error('Failed to insert post-task responses', { error: postTaskError })
    }
  }

  // Insert click events if provided
  if (input.clickEvents && input.clickEvents.length > 0) {
    const clickEventData = input.clickEvents.map((event) => ({
      session_id: sessionId,
      study_id: study.id,
      task_id: event.taskId,
      frame_id: event.frameId,
      timestamp: event.timestamp,
      x: event.x,
      y: event.y,
      was_hotspot: event.wasHotspot || false,
      triggered_transition: event.triggeredTransition || false,
      time_since_frame_load_ms: event.timeSinceFrameLoadMs || null,
      component_states: toJsonNullable(event.componentStates),
    }))

    const { error: clickError } = await supabase
      .from('prototype_test_click_events')
      .insert(clickEventData)

    if (clickError) {
      // Log but don't fail - click events are supplementary data
      logger?.error('Failed to insert click events', { error: clickError })
    }
  }

  // Insert navigation events if provided
  if (input.navigationEvents && input.navigationEvents.length > 0) {
    const navEventData = input.navigationEvents.map((event) => ({
      session_id: sessionId,
      study_id: study.id,
      task_id: event.taskId,
      from_frame_id: event.fromFrameId,
      to_frame_id: event.toFrameId,
      triggered_by: event.triggeredBy,
      time_on_from_frame_ms: event.timeOnFromFrameMs || null,
      sequence_number: event.sequenceNumber,
      timestamp: event.timestamp,
    }))

    const { error: navError } = await supabase
      .from('prototype_test_navigation_events')
      .insert(navEventData)

    if (navError) {
      // Log but don't fail - navigation events are supplementary data
      logger?.error('Failed to insert navigation events', { error: navError })
    }
  }

  // Insert component state events if provided
  if (input.componentStateEvents && input.componentStateEvents.length > 0) {
    const stateEventData = input.componentStateEvents.map((event) => ({
      session_id: sessionId,
      study_id: study.id,
      task_id: event.taskId,
      frame_id: event.frameId,
      component_node_id: event.componentNodeId,
      from_variant_id: event.fromVariantId,
      to_variant_id: event.toVariantId,
      is_timed_change: event.isTimedChange,
      sequence_number: event.sequenceNumber,
      timestamp: event.timestamp,
    }))

    const { error: stateError } = await supabase
      .from('prototype_test_component_state_events')
      .insert(stateEventData)

    if (stateError) {
      // Log but don't fail - component state events are supplementary data
      logger?.error('Failed to insert component state events', { error: stateError })
    }
  }

  // Store demographic data in participant metadata (same format as other study types)
  logger?.info('[PrototypeTestSubmit] Saving participant metadata', {
    participantId: participant.id,
    hasDemographicData: !!input.demographicData,
    demographicFields: input.demographicData
      ? Object.keys(input.demographicData)
      : [],
  })

  await markParticipantCompleted(
    supabase,
    participant.id,
    input.demographicData ? { demographic_data: input.demographicData } : undefined,
    logger
  )

  return { success: true, studyId: study.id, participantId: participant.id, error: null }
}
