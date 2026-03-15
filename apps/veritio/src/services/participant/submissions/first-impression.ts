/**
 * First Impression Test submission service.
 * Handles first impression test response submissions including:
 * - Exposure events with timing data
 * - Per-design question responses
 * - Focus/blur tracking during exposure
 */
import { toJson } from '../../../lib/supabase/json-utils'
import type { SubmissionResult } from '../types'
import { verifyParticipantSession, markParticipantCompleted, type SupabaseClientType } from './verification'

// ============================================================================
// Types
// ============================================================================

export interface FocusEvent {
  type: 'focus' | 'blur'
  timestamp: number
}

export interface ExposureEventInput {
  designId: string
  exposureSequence: number
  startedAt: number
  endedAt: number
  actualDurationMs: number
  configuredDurationMs: number
  countdownDurationMs: number
  viewportWidth: number
  viewportHeight: number
  imageRenderedWidth: number
  imageRenderedHeight: number
  usedMobileImage: boolean
  focusEvents: FocusEvent[]
}

export interface DesignResponseInput {
  designId: string
  exposure: ExposureEventInput
  questionAnswers: Record<string, unknown>
  questionsStartedAt: number | null
  completedAt: number
}

export interface DeviceInfoInput {
  deviceType: 'desktop' | 'tablet' | 'mobile'
  userAgent: string
  viewportWidth: number
  viewportHeight: number
}

export interface FirstImpressionSubmissionInput {
  sessionToken: string
  responses: DesignResponseInput[]
  selectedDesignId?: string // For random_single mode, which design was assigned
  assignmentMode: 'random_single' | 'sequential_all'
  deviceInfo: DeviceInfoInput
  demographicData?: Record<string, unknown> | null
}

/** Answer format with timing data (new format from player) */
interface AnswerWithTiming {
  value: unknown
  responseTimeMs: number | null
}

// ============================================================================
// Submission Handler
// ============================================================================

/**
 * Submit first impression test responses.
 * Records exposure events, focus tracking, and per-design question responses.
 * Supports both share_code and custom url_slug.
 */
export async function submitFirstImpressionResponse(
  supabase: SupabaseClientType,
  shareCodeOrSlug: string,
  input: FirstImpressionSubmissionInput,
  logger?: { info: (msg: string, data?: Record<string, unknown>) => void; warn: (msg: string, data?: Record<string, unknown>) => void; error: (msg: string, data?: Record<string, unknown>) => void }
): Promise<SubmissionResult> {
  const { study, participant, error } = await verifyParticipantSession(
    supabase,
    shareCodeOrSlug,
    input.sessionToken,
    'first_impression'
  )

  if (error) {
    return { success: false, error }
  }

  // Guard against empty responses array (Math.min() on empty spread = Infinity → invalid date)
  if (input.responses.length === 0) {
    return { success: false, error: new Error('No responses provided') }
  }

  // Calculate session timing
  const sessionStartedAt = Math.min(...input.responses.map(r => r.exposure.startedAt))
  const sessionCompletedAt = Date.now()
  const totalTimeMs = sessionCompletedAt - sessionStartedAt

  // Build design sequence for sequential mode
  const designSequence = input.responses.map(r => r.designId)

  // Create session record with all fields
  // Note: Using 'any' cast until types are regenerated after migration
  const { data: session, error: sessionError } = await (supabase as any)
    .from('first_impression_sessions')
    .insert({
      participant_id: participant.id,
      study_id: study.id,
      assignment_mode: input.assignmentMode,
      assigned_design_id: input.selectedDesignId || null,
      design_sequence: toJson(designSequence),
      device_type: input.deviceInfo.deviceType,
      user_agent: input.deviceInfo.userAgent,
      viewport_width: input.deviceInfo.viewportWidth,
      viewport_height: input.deviceInfo.viewportHeight,
      started_at: new Date(sessionStartedAt).toISOString(),
      completed_at: new Date(sessionCompletedAt).toISOString(),
      total_time_ms: totalTimeMs,
    })
    .select('id')
    .single()

  if (sessionError) {
    logger?.error('Failed to create first impression session', { error: sessionError })
    return { success: false, error: new Error('Failed to create session') }
  }

  // Process each design response
  for (const response of input.responses) {
    // Insert exposure event with correct column names matching database schema
    // Note: Using 'any' cast until types are regenerated after migration
    const { data: exposure, error: exposureError } = await (supabase as any)
      .from('first_impression_exposures')
      .insert({
        session_id: session.id,
        participant_id: participant.id,
        study_id: study.id,
        design_id: response.designId,
        exposure_sequence: response.exposure.exposureSequence,
        configured_duration_ms: response.exposure.configuredDurationMs,
        actual_display_ms: response.exposure.actualDurationMs,
        countdown_duration_ms: response.exposure.countdownDurationMs,
        exposure_started_at: new Date(response.exposure.startedAt).toISOString(),
        exposure_ended_at: new Date(response.exposure.endedAt).toISOString(),
        questions_started_at: response.questionsStartedAt
          ? new Date(response.questionsStartedAt).toISOString()
          : null,
        questions_completed_at: response.completedAt
          ? new Date(response.completedAt).toISOString()
          : null,
        viewport_width: response.exposure.viewportWidth,
        viewport_height: response.exposure.viewportHeight,
        image_rendered_width: response.exposure.imageRenderedWidth,
        image_rendered_height: response.exposure.imageRenderedHeight,
        used_mobile_image: response.exposure.usedMobileImage,
      })
      .select('id')
      .single()

    if (exposureError) {
      logger?.error('Failed to insert first impression exposure', { error: exposureError })
      return { success: false, error: new Error('Failed to save exposure data') }
    }

    // Insert focus/blur events into interaction_events table
    if (response.exposure.focusEvents.length > 0) {
      const interactionEvents = response.exposure.focusEvents.map(event => ({
        exposure_id: exposure.id,
        session_id: session.id,
        study_id: study.id,
        participant_id: participant.id,
        phase: 'exposure',
        event_type: event.type,
        timestamp_ms: event.timestamp - response.exposure.startedAt,
        event_timestamp: new Date(event.timestamp).toISOString(),
        event_data: toJson({}),
      }))

      await (supabase as any)
        .from('first_impression_interaction_events')
        .insert(interactionEvents)
        .catch(() => {
          // Non-critical - continue even if interaction events fail
        })
    }

    // Insert question responses with correct column names
    const questionEntries = Object.entries(response.questionAnswers)
    if (questionEntries.length > 0) {
      const questionData = questionEntries.map(([questionId, answer]) => {
        // Handle both old format (just value) and new format (value + responseTimeMs)
        const isNewFormat = answer && typeof answer === 'object' && 'value' in (answer as object)
        const typedAnswer = answer as AnswerWithTiming
        const value = isNewFormat ? typedAnswer.value : answer
        const responseTimeMs = isNewFormat ? typedAnswer.responseTimeMs : null

        return {
          exposure_id: exposure.id,
          session_id: session.id,
          participant_id: participant.id,
          study_id: study.id,
          design_id: response.designId,
          question_id: questionId,
          response_value: toJson(value),
          response_time_ms: responseTimeMs,
          submitted_at: new Date(response.completedAt).toISOString(),
        }
      })

      // Note: Using 'any' cast until types are regenerated after migration
      const { error: responseError } = await (supabase as any)
        .from('first_impression_responses')
        .insert(questionData)

      if (responseError) {
        // Log but don't fail - question responses are supplementary
        logger?.error('Failed to insert first impression responses', { error: responseError })
      }
    }
  }

  // Store demographic data in same format as other study types (survey)
  await markParticipantCompleted(
    supabase,
    participant.id,
    input.demographicData ? { demographic_data: input.demographicData } : undefined,
    logger
  )

  return { success: true, studyId: study.id, participantId: participant.id, error: null }
}
