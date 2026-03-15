import type { ReactNode } from 'react'
import type { StudyFlowQuestionRow, StudyFlowResponseRow, Participant } from '@veritio/study-types'

/**
 * Configuration for a single status filter option
 */
export interface StatusFilterOption<T extends string = string> {
  /** The filter value (e.g., 'all', 'completed', 'in_progress') */
  value: T
  /** Display label for the option */
  label: string
  /** Optional function to compute count from participants */
  getCount?: (participants: Participant[], extraData?: unknown) => number
  /** Show a separator line before this option */
  separatorBefore?: boolean
  /** Optional icon component */
  icon?: React.ComponentType<{ className?: string }>
}

/**
 * Status filter configuration (test-type specific)
 */
export interface StatusFilterConfig<T extends string = string> {
  /** Available filter options */
  options: StatusFilterOption<T>[]
  /** Default filter value */
  defaultValue: T
}

/**
 * Configuration for segment creation modal
 */
export interface SegmentConfig {
  /** Categories range for card sort (undefined for other types) */
  categoriesRange?: { min: number; max: number }
}

/**
 * Props for rendering the participants list
 */
export interface ParticipantsListRenderProps<TStatusFilter extends string> {
  studyId: string
  statusFilter: TStatusFilter
}

/**
 * Props for rendering the segments list
 */
export interface SegmentsListRenderProps {
  studyId: string
}

/**
 * Base props for the ParticipantsTabContainerBase component
 */
export interface ParticipantsTabContainerBaseProps<TStatusFilter extends string> {
  /** Study ID for API calls */
  studyId: string

  /** Participants array (for status counts and segment list) */
  participants: Participant[]

  /** Flow questions for segment filtering */
  flowQuestions?: StudyFlowQuestionRow[]

  /** Flow responses for segment filtering */
  flowResponses?: StudyFlowResponseRow[]

  /** Initial sub-tab to show */
  initialTab?: 'list' | 'segments'

  /** Callback when sub-tab changes (for state persistence) */
  onTabChange?: (tab: 'list' | 'segments') => void

  /** Controlled status filter value */
  statusFilter?: TStatusFilter

  /** Callback when status filter changes (for state persistence) */
  onStatusFilterChange?: (filter: TStatusFilter) => void

  /** Status filter configuration (test-type specific) */
  statusFilterConfig: StatusFilterConfig<TStatusFilter>

  /** Segment configuration (test-type specific) */
  segmentConfig: SegmentConfig

  /** Responses data for SegmentsList (format normalized per test type) */
  segmentListResponses: Array<{ participant_id: string; total_time_ms?: number | null }>

  /** Extra data passed to status filter count functions */
  statusFilterExtraData?: unknown

  /** Render function for the participants list */
  renderParticipantsList: (props: ParticipantsListRenderProps<TStatusFilter>) => ReactNode

  /** Optional: custom render for segments list (defaults to SegmentsList) */
  renderSegmentsList?: (props: SegmentsListRenderProps) => ReactNode

  /** Optional: additional controls to render in the header row (e.g., Columns dropdown) */
  renderHeaderControls?: () => ReactNode

  /** When true, disables all auth-dependent features (segments CRUD, API calls). Used for public shared results. */
  readOnly?: boolean
}
