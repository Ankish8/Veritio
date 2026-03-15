/**
 * Central registry of all event topics and their payload types.
 * This serves as the single source of truth for event type safety.
 *
 * Phase 1: All topics typed as `unknown` for backwards compatibility
 * Phase 2: Replace `unknown` with actual payload types progressively
 */

export interface EventTopicMap {
  // =============================================================================
  // Study Lifecycle Events
  // =============================================================================
  'study-created': unknown
  'study-updated': unknown
  'study-deleted': unknown
  'study-fetched': unknown
  'study-listed': unknown
  'study-initialized': unknown
  'study-archived': unknown
  'study-restored': unknown
  'study-should-close': unknown
  'study-continues': unknown
  'study-duplication-requested': unknown
  'study-analytics-updated': unknown

  // =============================================================================
  // Project Lifecycle Events
  // =============================================================================
  'project-created': unknown
  'project-updated': unknown
  'project-deleted': unknown
  'project-fetched': unknown
  'project-archived': unknown
  'project-restored': unknown
  'project-initialized': unknown
  'project-analytics-ready': unknown

  // =============================================================================
  // Card CRUD Events
  // =============================================================================
  'card-created': unknown
  'card-updated': unknown
  'card-deleted': unknown
  'cards-listed': unknown
  'cards-bulk-updated': unknown

  // =============================================================================
  // Category CRUD Events
  // =============================================================================
  'category-created': unknown
  'category-updated': unknown
  'category-deleted': unknown
  'categories-listed': unknown

  // =============================================================================
  // Tree Node CRUD Events
  // =============================================================================
  'tree-node-created': unknown
  'tree-node-updated': unknown
  'tree-node-deleted': unknown
  'tree-nodes-listed': unknown
  'tree-nodes-bulk-updated': unknown

  // =============================================================================
  // Task CRUD Events
  // =============================================================================
  'task-created': unknown
  'task-updated': unknown
  'task-deleted': unknown
  'tasks-listed': unknown
  'tasks-bulk-updated': unknown

  // =============================================================================
  // Survey Section Events
  // =============================================================================
  'survey-section-created': unknown
  'survey-section-updated': unknown
  'survey-section-deleted': unknown
  'survey-sections-reordered': unknown
  'survey-sections-fetched': unknown

  // =============================================================================
  // Flow Question Events
  // =============================================================================
  'flow-question-created': unknown
  'flow-question-updated': unknown
  'flow-question-deleted': unknown
  'flow-questions-bulk-updated': unknown
  'flow-questions-listed': unknown

  // =============================================================================
  // Survey Rule Events
  // =============================================================================
  'survey-rule-created': unknown
  'survey-rule-updated': unknown
  'survey-rule-deleted': unknown
  'survey-rules-bulk-updated': unknown
  'survey-rules-reordered': unknown
  'survey-rules-fetched': unknown
  'survey-rules-bulk-deleted': unknown

  // =============================================================================
  // Segment Events
  // =============================================================================
  'segment-created': unknown
  'segment-updated': unknown
  'segment-deleted': unknown
  'segments-fetched': unknown

  // =============================================================================
  // Participation Events
  // =============================================================================
  'participant-started': unknown
  'participant-activity': unknown
  'response-submitted': unknown
  'response-validated': unknown
  'survey-completed': unknown
  'participate-study-fetched': unknown

  // =============================================================================
  // Analysis & Results Events
  // =============================================================================
  'results-fetched': unknown
  'results-analysis-requested': unknown
  'results-analytics-ready': unknown
  'participants-analysis-fetched': unknown
  'participants-auto-flagged': unknown
  'participant-exclusion-toggled': unknown

  // =============================================================================
  // Recording Events
  // =============================================================================
  'recording-initialized': unknown
  'recording-finalized': unknown
  'recording-deleted': unknown
  'recording-compressed': unknown
  'recording-chunk-confirmed': unknown
  'recording-events-submitted': unknown
  'recording-share-created': unknown
  'recording-share-revoked': unknown
  'recording-comment-created': unknown
  'recording-comment-updated': unknown
  'recording-comment-deleted': unknown
  'recording-comment-created-via-share': unknown
  'recording-clip-created': unknown
  'recording-clip-updated': unknown
  'recording-clip-deleted': unknown
  'recording-annotation-created': unknown
  'recording-annotation-updated': unknown
  'recording-annotation-deleted': unknown

  // =============================================================================
  // Transcription Events
  // =============================================================================
  'transcription-completed': unknown
  'transcription-failed': unknown

  // =============================================================================
  // Integration Events
  // =============================================================================
  'figma-connected': unknown
  'figma-disconnected': unknown
  'first-impression-image-imported': unknown
  'first-click-image-imported': unknown
  'prototype-synced': unknown
  'prototype-updated': unknown
  'prototype-upserted': unknown
  'prototype-deleted': unknown
  'prototype-tasks-updated': unknown

  // =============================================================================
  // Question/Note Events
  // =============================================================================
  'question-note-created': unknown
  'question-note-deleted': unknown
  'section-note-created': unknown
  'section-note-deleted': unknown

  // =============================================================================
  // UI/User Action Events
  // =============================================================================
  'favorite-toggled': unknown
  'favorites-fetched': unknown

  // =============================================================================
  // Notification & Observability Events
  // =============================================================================
  'notification': unknown
  'digest-queue-update': unknown

  // =============================================================================
  // Export Events
  // =============================================================================
  'pdf-exported': unknown

  // =============================================================================
  // Dashboard Events
  // =============================================================================
  'dashboard-fetched': unknown

  // =============================================================================
  // Standardization Events
  // =============================================================================
  'standardizations-updated': unknown

  // =============================================================================
  // Flow Response Events
  // =============================================================================
  'flow-responses-submitted': unknown
}

/**
 * Union type of all valid event topic names
 */
export type EventTopic = keyof EventTopicMap
