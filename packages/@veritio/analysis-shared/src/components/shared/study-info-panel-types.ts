import type { ClosingRule } from '@veritio/core'

export type StudyStatus = 'draft' | 'active' | 'paused' | 'completed'

export interface FirstImpressionDisplaySettings {
  exposureDurationMs: number
  countdownDurationMs: number
  designAssignmentMode: 'random_single' | 'sequential_all'
  questionDisplayMode?: 'one_per_page' | 'all_on_page'
}

export interface CardSortDisplaySettings {
  mode: 'open' | 'closed' | 'hybrid'
  randomizeCards?: boolean
  showProgress?: boolean
  allowSkip?: boolean
}

export interface TreeTestDisplaySettings {
  randomizeTasks?: boolean
  showBreadcrumbs?: boolean
  allowBack?: boolean
  showTaskProgress?: boolean
}

export interface FirstClickDisplaySettings {
  randomizeTasks?: boolean
  startTasksImmediately?: boolean
  showTaskProgress?: boolean
  imageScaling?: 'scale_on_small' | 'fit' | 'never_scale'
}

export interface PrototypeTestDisplaySettings {
  randomizeTasks?: boolean
  showTaskProgress?: boolean
  clickableAreaFlashing?: boolean
  tasksEndAutomatically?: boolean
}

export interface SurveyDisplaySettings {
  showOneQuestionPerPage?: boolean
  randomizeQuestions?: boolean
  showProgressBar?: boolean
  allowSkipQuestions?: boolean
}

export type TestDisplaySettings =
  | { type: 'first_impression'; settings: FirstImpressionDisplaySettings }
  | { type: 'card_sort'; settings: CardSortDisplaySettings }
  | { type: 'tree_test'; settings: TreeTestDisplaySettings }
  | { type: 'first_click'; settings: FirstClickDisplaySettings }
  | { type: 'prototype_test'; settings: PrototypeTestDisplaySettings }
  | { type: 'survey'; settings: SurveyDisplaySettings }

/**
 * Response metrics for the panel's Responses section.
 *
 * Optional as a whole: callers that only know a headline count keep passing
 * `participantCount` and the richer rows simply do not render.
 */
export interface StudyResponseStats {
  total: number
  completed: number
  inProgress: number
  /** Percentage 0-100 of total participants that finished */
  completionRate: number
  /** Mean completion time across completed participants */
  averageDurationSeconds: number | null
  lastResponseAt?: string | null
}

export interface StudyInfoPanelProps {
  studyType: string
  status: string
  createdAt: string
  updatedAt?: string | null
  launchedAt?: string | null
  studyMode?: string
  description?: string | null
  participantCount?: number
  /** Richer response metrics; `total` supersedes participantCount when present */
  responseStats?: StudyResponseStats | null
  /** True while responseStats is still being fetched, to avoid flashing zeroes */
  isLoadingResponseStats?: boolean
  closingRule?: ClosingRule | null
  /** Participant-facing study language, e.g. "en-US" */
  language?: string | null
  /** Whether a study password is set; the password itself is never passed in */
  isPasswordProtected?: boolean
  /** Whether session/screen recording is enabled for participants */
  isRecordingEnabled?: boolean
  /** @deprecated Use testSettings instead */
  firstImpressionSettings?: FirstImpressionDisplaySettings | null
  testSettings?: TestDisplaySettings | null
  onStatusChange?: (newStatus: StudyStatus) => void
  isChangingStatus?: boolean
  context?: 'builder' | 'results'
}
