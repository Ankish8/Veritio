// Types
export type {
  StudyForParticipation,
  StudyPasswordRequired,
  SessionResult,
  SubmissionResult,
  ServiceResult,
} from './types'

// Study access (now uses Motia-compatible client, works in both Next.js and Motia)
export { getStudyByShareCode } from './study-access'

// Session management
export { createParticipant } from './session'
export type { CreateParticipantInput } from './session'

// Response submissions (split into separate modules for maintainability)
// NOTE: Direct file imports used instead of './submissions' barrel export
// due to Motia beta build issue with nested directories
export { submitCardSortResponse } from './submissions/card-sort'
export type { CardSortSubmissionInput } from './submissions/card-sort'

export { submitTreeTestResponse } from './submissions/tree-test'
export type { TreeTestSubmissionInput, PostTaskQuestionResponseInput } from './submissions/tree-test'

export { completeSurveyParticipation } from './submissions/survey'
export type { SurveyCompletionInput } from './submissions/survey'

export { submitPrototypeTestResponse } from './submissions/prototype-test'
export type { PrototypeTestSubmissionInput } from './submissions/prototype-test'

export { submitFirstClickResponse } from './submissions/first-click'
export type { FirstClickSubmissionInput, FirstClickResponseInput } from './submissions/first-click'

export { submitFirstImpressionResponse } from './submissions/first-impression'
export type {
  FirstImpressionSubmissionInput,
  DesignResponseInput,
  ExposureEventInput,
  FocusEvent as FirstImpressionFocusEvent,
} from './submissions/first-impression'

export { submitLiveWebsiteResponse } from './submissions/live-website'
export type { LiveWebsiteSubmissionInput, LiveWebsiteResponseInput } from './submissions/live-website'
