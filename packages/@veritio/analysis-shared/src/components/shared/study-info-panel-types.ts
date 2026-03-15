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

export interface StudyInfoPanelProps {
  studyType: string
  status: string
  createdAt: string
  updatedAt?: string | null
  launchedAt?: string | null
  studyMode?: string
  description?: string | null
  participantCount?: number
  closingRule?: ClosingRule | null
  /** @deprecated Use testSettings instead */
  firstImpressionSettings?: FirstImpressionDisplaySettings | null
  testSettings?: TestDisplaySettings | null
  onStatusChange?: (newStatus: StudyStatus) => void
  isChangingStatus?: boolean
  context?: 'builder' | 'results'
}
