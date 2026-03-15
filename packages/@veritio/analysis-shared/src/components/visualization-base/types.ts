import type { StudyFlowQuestionRow, StudyFlowResponseRow } from '@veritio/core'

// QuestionType from study-flow-types, inlined to avoid @/ dependency
type QuestionType =
  | 'single_line_text'
  | 'multi_line_text'
  | 'multiple_choice'
  | 'image_choice'
  | 'opinion_scale'
  | 'yes_no'
  | 'nps'
  | 'matrix'
  | 'ranking'
  | 'slider'
  | 'semantic_differential'
  | 'constant_sum'
  | 'audio_response'

export interface BaseVisualizationProps {
  question: StudyFlowQuestionRow
  responses: StudyFlowResponseRow[]
  questionType?: QuestionType
}

export interface VisualizationRowData {
  id: string
  label: string
  count: number
  percentage: number
}

export interface AggregatedStats<T extends VisualizationRowData = VisualizationRowData> {
  rows: T[]
  totalResponses: number
  maxCount: number
}
