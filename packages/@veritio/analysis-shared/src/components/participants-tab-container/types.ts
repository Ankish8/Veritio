import type { ReactNode } from 'react'
import type { StudyFlowQuestionRow, StudyFlowResponseRow, Participant } from '@veritio/core'

export interface StatusFilterOption<T extends string = string> {
  value: T
  label: string
  getCount?: (participants: Participant[], extraData?: unknown) => number
  separatorBefore?: boolean
  icon?: React.ComponentType<{ className?: string }>
}

export interface StatusFilterConfig<T extends string = string> {
  options: StatusFilterOption<T>[]
  defaultValue: T
}

export interface SegmentConfig {
  categoriesRange?: { min: number; max: number }
}

export interface ParticipantsListRenderProps<TStatusFilter extends string> {
  studyId: string
  statusFilter: TStatusFilter
}

export interface SegmentsListRenderProps {
  studyId: string
}

export interface ParticipantsTabContainerBaseProps<TStatusFilter extends string> {
  studyId: string
  participants: Participant[]
  flowQuestions?: StudyFlowQuestionRow[]
  flowResponses?: StudyFlowResponseRow[]
  initialTab?: 'list' | 'segments'
  onTabChange?: (tab: 'list' | 'segments') => void
  statusFilter?: TStatusFilter
  onStatusFilterChange?: (filter: TStatusFilter) => void
  statusFilterConfig: StatusFilterConfig<TStatusFilter>
  segmentConfig: SegmentConfig
  segmentListResponses: Array<{ participant_id: string; total_time_ms?: number | null }>
  statusFilterExtraData?: unknown
  renderParticipantsList: (props: ParticipantsListRenderProps<TStatusFilter>) => ReactNode
  renderSegmentsList?: (props: SegmentsListRenderProps) => ReactNode
  renderHeaderControls?: () => ReactNode
}
