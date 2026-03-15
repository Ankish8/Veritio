/**
 * Participant submissions service - barrel exports.
 *
 * This module provides submission handlers for all study types:
 * - Card Sort
 * - Tree Test
 * - Survey
 * - Prototype Test
 * - First-Click Test
 *
 * Each handler verifies the participant session, saves responses,
 * and marks the participant as completed.
 */

// Card Sort
export { submitCardSortResponse } from './card-sort'
export type { CardSortSubmissionInput } from './card-sort'

// Tree Test
export { submitTreeTestResponse } from './tree-test'
export type { TreeTestSubmissionInput, PostTaskQuestionResponseInput } from './tree-test'

// Survey
export { completeSurveyParticipation } from './survey'
export type { SurveyCompletionInput } from './survey'

// Prototype Test
export { submitPrototypeTestResponse } from './prototype-test'
export type { PrototypeTestSubmissionInput } from './prototype-test'

// First-Click
export { submitFirstClickResponse } from './first-click'
export type { FirstClickSubmissionInput, FirstClickResponseInput } from './first-click'

// First Impression
export { submitFirstImpressionResponse } from './first-impression'
export type {
  FirstImpressionSubmissionInput,
  DesignResponseInput,
  ExposureEventInput,
  FocusEvent,
} from './first-impression'

// Shared utilities (re-exported for edge cases)
export { verifyParticipantSession, markParticipantCompleted } from './verification'
export type { SupabaseClientType, VerifyResult } from './verification'
