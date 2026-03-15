/**
 * Type-safe event emission utilities.
 * Enforces correct payload shape for each event topic.
 */

import type { EventTopicMap, EventTopic } from './event-topic-map'

/**
 * Type-safe event emission structure.
 * Use this to ensure correct payload for each topic.
 */
export type TypedEmitEvent<K extends EventTopic> = {
  topic: K
  data: EventTopicMap[K]
}

/**
 * Type-safe emit function signature.
 * Replaces the untyped EmitFunction from motia/types.
 */
export type TypedEmitFunction = <K extends EventTopic>(
  event: TypedEmitEvent<K>
) => Promise<void>

/**
 * Helper to create a type-safe emit wrapper.
 * Wraps the existing untyped emit function with type safety.
 *
 * @example
 * const typedEmit = createTypedEmit(ctx.emit)
 * await typedEmit({ topic: 'study-created', data: { studyId, userId } })
 */
export function createTypedEmit(
  unsafeEmit: (event: { topic: string; data: Record<string, unknown> }) => Promise<void>
): TypedEmitFunction {
  return unsafeEmit as TypedEmitFunction
}

/**
 * Type guard to validate event at runtime (optional, for debugging).
 * Can be extended with Zod schemas for runtime validation.
 */
export function isValidEvent<K extends EventTopic>(
  topic: K,
  data: unknown
): data is EventTopicMap[K] {
  // Runtime validation can be added here using Zod schemas
  // For now, just ensure data exists
  return data !== null && data !== undefined
}

/**
 * Extract valid event topic names as a const array.
 * Useful for validation and tooling.
 */
export const EVENT_TOPICS = [
  // Study Lifecycle
  'study-created',
  'study-updated',
  'study-deleted',
  'study-fetched',
  'study-listed',
  'study-initialized',
  'study-archived',
  'study-restored',
  'study-should-close',
  'study-continues',
  'study-duplication-requested',
  'study-analytics-updated',

  // Project Lifecycle
  'project-created',
  'project-updated',
  'project-deleted',
  'project-fetched',
  'project-archived',
  'project-restored',
  'project-initialized',
  'project-analytics-ready',

  // Card CRUD
  'card-created',
  'card-updated',
  'card-deleted',
  'cards-listed',
  'cards-bulk-updated',

  // Category CRUD
  'category-created',
  'category-updated',
  'category-deleted',
  'categories-listed',

  // Tree Node CRUD
  'tree-node-created',
  'tree-node-updated',
  'tree-node-deleted',
  'tree-nodes-listed',
  'tree-nodes-bulk-updated',

  // Task CRUD
  'task-created',
  'task-updated',
  'task-deleted',
  'tasks-listed',
  'tasks-bulk-updated',

  // Survey Sections
  'survey-section-created',
  'survey-section-updated',
  'survey-section-deleted',
  'survey-sections-reordered',
  'survey-sections-fetched',

  // Flow Questions
  'flow-question-created',
  'flow-question-updated',
  'flow-question-deleted',
  'flow-questions-bulk-updated',
  'flow-questions-listed',

  // Survey Rules
  'survey-rule-created',
  'survey-rule-updated',
  'survey-rule-deleted',
  'survey-rules-bulk-updated',
  'survey-rules-reordered',
  'survey-rules-fetched',
  'survey-rules-bulk-deleted',

  // Segments
  'segment-created',
  'segment-updated',
  'segment-deleted',
  'segments-fetched',

  // Participation
  'participant-started',
  'participant-activity',
  'response-submitted',
  'response-validated',
  'survey-completed',
  'participate-study-fetched',

  // Analysis & Results
  'results-fetched',
  'results-analysis-requested',
  'results-analytics-ready',
  'participants-analysis-fetched',
  'participants-auto-flagged',
  'participant-exclusion-toggled',

  // Recording
  'recording-initialized',
  'recording-finalized',
  'recording-deleted',
  'recording-compressed',
  'recording-chunk-confirmed',
  'recording-events-submitted',
  'recording-share-created',
  'recording-share-revoked',
  'recording-comment-created',
  'recording-comment-updated',
  'recording-comment-deleted',
  'recording-comment-created-via-share',
  'recording-clip-created',
  'recording-clip-updated',
  'recording-clip-deleted',
  'recording-annotation-created',
  'recording-annotation-updated',
  'recording-annotation-deleted',

  // Transcription
  'transcription-completed',
  'transcription-failed',

  // Integration
  'figma-connected',
  'figma-disconnected',
  'first-impression-image-imported',
  'first-click-image-imported',
  'prototype-synced',
  'prototype-updated',
  'prototype-upserted',
  'prototype-deleted',
  'prototype-tasks-updated',

  // Notes
  'question-note-created',
  'question-note-deleted',
  'section-note-created',
  'section-note-deleted',

  // UI/User
  'favorite-toggled',
  'favorites-fetched',

  // Notifications
  'notification',
  'digest-queue-update',

  // Export
  'pdf-exported',

  // Dashboard
  'dashboard-fetched',

  // Standardization
  'standardizations-updated',

  // Flow Responses
  'flow-responses-submitted',
] as const
