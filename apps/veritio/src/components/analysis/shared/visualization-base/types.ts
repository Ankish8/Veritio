/**
 * Visualization Base Types
 *
 * Common type definitions for questionnaire response visualizations.
 */

import type { StudyFlowQuestionRow, StudyFlowResponseRow } from '@veritio/study-types'
import type { QuestionType } from '@veritio/study-types/study-flow-types'

/**
 * Base props shared by all visualization components
 */
export interface BaseVisualizationProps {
  question: StudyFlowQuestionRow
  responses: StudyFlowResponseRow[]
  questionType?: QuestionType
}

/**
 * Standard row data structure for table visualizations
 */
export interface VisualizationRowData {
  id: string
  label: string
  count: number
  percentage: number
}

/**
 * Aggregated statistics from response processing
 */
export interface AggregatedStats<T extends VisualizationRowData = VisualizationRowData> {
  rows: T[]
  totalResponses: number
  maxCount: number
}
