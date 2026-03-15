/**
 * Panel Services
 *
 * Barrel export for all panel-related services.
 * These services handle the Panel CRM feature including participants,
 * tags, segments, incentives, and widget configuration.
 */

// Participant CRM
export {
  PanelParticipantService,
  createPanelParticipantService,
  type PaginatedResult,
} from './participant-service'

// Tags
export { PanelTagService, createPanelTagService, type PanelTagWithCount } from './tag-service'

// Tag Assignments
export { PanelTagAssignmentService, createPanelTagAssignmentService } from './tag-assignment-service'

// Study Participations
export {
  PanelParticipationService,
  createPanelParticipationService,
  type ParticipationStats,
} from './participation-service'

// Incentives
export {
  PanelIncentiveService,
  createPanelIncentiveService,
  type IncentiveStats,
} from './incentive-service'

// Widget
export {
  PanelWidgetService,
  createPanelWidgetService,
  type WidgetCapturePayload,
  type WidgetCaptureResult,
} from './widget-service'

// Segments
export {
  PanelSegmentService,
  createPanelSegmentService,
  type SegmentWithParticipants,
} from './segment-service'

// Notes
export { PanelNoteService, createPanelNoteService } from './note-service'

// Study Completion Sync
export {
  StudyCompletionSyncService,
  createStudyCompletionSyncService,
  type StudyCompletionSyncInput,
  type StudyCompletionSyncResult,
} from './study-completion-sync'
