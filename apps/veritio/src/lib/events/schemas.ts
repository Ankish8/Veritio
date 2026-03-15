/**
 * Shared Event Schemas
 *
 * Canonical schemas for event payloads to ensure type consistency
 * across all event handlers that subscribe to the same topics.
 *
 * IMPORTANT: When multiple handlers subscribe to the same event topic,
 * they MUST use the same input schema. This file defines those schemas.
 */

import { z } from 'zod'

// =============================================================================
// Common Types
// =============================================================================

export const studyTypeEnum = z.enum([
  'card_sort',
  'tree_test',
  'survey',
  'prototype_test',
  'first_click',
  'first_impression',
  'live_website_test',
])

export type StudyType = z.infer<typeof studyTypeEnum>

// =============================================================================
// Response Events
// =============================================================================

/**
 * Schema for response-submitted event
 * Used by: validate-response, sync-study-to-panel, check-notification-triggers
 */
export const responseSubmittedSchema = z.object({
  studyId: z.string().uuid(),
  participantId: z.string().uuid(),
  studyType: studyTypeEnum,
  shareCode: z.string(),
})

export type ResponseSubmittedEvent = z.infer<typeof responseSubmittedSchema>

/**
 * Schema for response-validated event
 * Used by: process-results-analysis, invalidate-metrics-cache, check-closing-rules
 *
 * Note: This uses a superset schema that includes all fields needed by subscribers.
 * Handlers should only use the fields they need.
 */
export const responseValidatedSchema = z.object({
  studyId: z.string().uuid(),
  participantId: z.string().uuid(),
  studyType: studyTypeEnum,
  shareCode: z.string(),
  userId: z.string().optional(), // For process-results-analysis
})

export type ResponseValidatedEvent = z.infer<typeof responseValidatedSchema>

/**
 * Schema for survey-completed event
 * Used by: sync-study-to-panel, check-notification-triggers
 *
 * NOTE: This is aliased to responseSubmittedSchema because they are structurally
 * identical. Motia requires all subscribers to the same topic to use the same
 * schema reference for compatibility validation.
 */
export const surveyCompletedSchema = responseSubmittedSchema

export type SurveyCompletedEvent = z.infer<typeof surveyCompletedSchema>

/**
 * Schema for results-analysis-requested event
 * Used by: process-results-analysis (subscriber)
 * Emitted by: finalize-study-closure
 *
 * This is a different payload shape than response-validated, containing
 * analysis request metadata rather than participant data.
 */
export const resultsAnalysisRequestedSchema = z.object({
  studyId: z.string().uuid(),
  studyType: studyTypeEnum,
  priority: z.enum(['high', 'normal', 'low']).optional(),
})

export type ResultsAnalysisRequestedEvent = z.infer<typeof resultsAnalysisRequestedSchema>

// =============================================================================
// Participant Events
// =============================================================================

/**
 * Schema for participant-started event
 * Used by: track-participant-started
 */
export const participantStartedSchema = z.object({
  studyId: z.string().uuid(),
  participantId: z.string().uuid(),
  shareCode: z.string(),
})

export type ParticipantStartedEvent = z.infer<typeof participantStartedSchema>

// =============================================================================
// Resource Events
// =============================================================================

/**
 * Schema for project-created event
 * Used by: initialize-project-defaults, setup-project-analytics
 */
export const projectCreatedSchema = z.object({
  projectId: z.string().uuid(),
  userId: z.string(),
  name: z.string(),
})

export type ProjectCreatedEvent = z.infer<typeof projectCreatedSchema>

/**
 * Schema for study-created event
 * Used by: initialize-study-defaults, send-study-created-notification
 */
export const studyCreatedSchema = z.object({
  studyId: z.string().uuid(),
  studyType: studyTypeEnum,
  projectId: z.string().uuid(),
  userId: z.string(),
  title: z.string().optional(),
})

export type StudyCreatedEvent = z.infer<typeof studyCreatedSchema>
