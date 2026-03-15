/**
 * Results Page Types
 *
 * Type definitions for study results data across all study types.
 */

import type { DendrogramNode, LinkageMethod } from '@/lib/algorithms/hierarchical-clustering'
import type { SimilarityResult } from '@/lib/algorithms/similarity-matrix'
import type { OverallMetrics, TreeTestResponse, Participant as TreeTestParticipant } from '@/lib/algorithms/tree-test-analysis'
import type { PrototypeTestMetrics } from '@/lib/algorithms/prototype-test-analysis'
import type {
  StudyFlowQuestionRow,
  StudyFlowResponseRow,
  Participant,
  CardSortResponse,
  Category,
  Card,
  CategoryStandardization,
  Task,
  TreeNode,
  PrototypeTestPrototype,
  PrototypeTestTask,
  PrototypeTestFrame,
  PrototypeTestTaskAttempt,
  PrototypeTestSession,
} from '@veritio/study-types'
import type { LiveWebsiteMetrics } from '@/services/results/live-website-overview'

/**
 * Card Sort results data structure
 */
export interface CardSortResultsData {
  study: {
    id: string
    title: string
    description: string | null
    study_type: 'card_sort'
    status: string
    share_code: string
    settings: {
      mode?: 'open' | 'closed' | 'hybrid'
      [key: string]: unknown
    }
    launched_at: string | null
    created_at: string
  }
  cards: Card[]
  categories: Category[]
  stats: {
    totalParticipants: number
    completedParticipants: number
    abandonedParticipants: number
    completionRate: number
    avgCompletionTimeMs: number
  }
  responses: CardSortResponse[]
  participants: Participant[]
  analysis: {
    similarityMatrix: SimilarityResult
    dendrogram: DendrogramNode
    /** Clustering method: 'average' (UPGMA/AAM) or 'ward' (BMM) */
    dendrogramMethod?: LinkageMethod
    optimalOrder: string[]
    suggestedClusters: { count: number; heights: number[] }
    topSimilarPairs: { cardA: string; cardB: string; similarity: number }[]
    naturalClusters: string[][]
    categoryAgreement: Record<
      string,
      {
        cardLabel: string
        categories: { name: string; count: number; percentage: number }[]
      }
    >
  } | null
  standardizations?: CategoryStandardization[]
  flowQuestions?: StudyFlowQuestionRow[]
  flowResponses?: StudyFlowResponseRow[]
}

/**
 * Tree Test results data structure
 */
export interface TreeTestResultsData {
  study: {
    id: string
    title: string
    description: string | null
    study_type: 'tree_test'
    status: string
    share_code: string
    settings: unknown
    launched_at: string | null
    created_at: string
  }
  tasks: Task[]
  nodes: TreeNode[]
  responses: TreeTestResponse[]
  postTaskResponses: Array<{ id: string; participant_id: string; task_id: string; question_id: string; value: unknown }>
  participants: TreeTestParticipant[]
  metrics: OverallMetrics
  flowQuestions: StudyFlowQuestionRow[]
  flowResponses: StudyFlowResponseRow[]
}

/**
 * Survey results data structure
 */
export interface SurveyResultsData {
  study: {
    id: string
    title: string
    description: string | null
    study_type: 'survey'
    status: string
    share_code: string
    settings: unknown
    launched_at: string | null
    created_at: string
  }
  stats: {
    totalParticipants: number
    completedParticipants: number
    abandonedParticipants: number
    completionRate: number
    avgCompletionTimeMs: number
  }
  participants: Participant[]
  flowQuestions: StudyFlowQuestionRow[]
  flowResponses: StudyFlowResponseRow[]
}

/**
 * Prototype Test results data structure
 */
export interface PrototypeTestResultsData {
  study: {
    id: string
    title: string
    description: string | null
    study_type: 'prototype_test'
    status: string
    share_code: string
    settings: unknown
    launched_at: string | null
    created_at: string
  }
  prototype: PrototypeTestPrototype | null
  tasks: PrototypeTestTask[]
  frames: PrototypeTestFrame[]
  taskAttempts: PrototypeTestTaskAttempt[]
  postTaskResponses: Array<{ id: string; participant_id: string; task_id: string; question_id: string; value: unknown }>
  sessions: PrototypeTestSession[]
  participants: Participant[]
  metrics: PrototypeTestMetrics
  flowQuestions: StudyFlowQuestionRow[]
  flowResponses: StudyFlowResponseRow[]
}

/**
 * Live Website Test results data structure
 */
export interface LiveWebsiteVariant {
  id: string
  name: string
  url: string
  weight: number
  position: number
}

export interface LiveWebsiteResultsData {
  study: {
    id: string
    title: string
    description: string | null
    study_type: 'live_website_test'
    status: string
    share_code: string
    settings: unknown
    launched_at: string | null
    created_at: string
  }
  tasks: LiveWebsiteTask[]
  responses: LiveWebsiteResponse[]
  postTaskResponses: LiveWebsitePostTaskResponse[]
  events: LiveWebsiteEvent[]
  screenshots: LiveWebsitePageScreenshot[]
  participants: Participant[]
  metrics: LiveWebsiteMetrics
  flowQuestions: StudyFlowQuestionRow[]
  flowResponses: StudyFlowResponseRow[]
  variants: LiveWebsiteVariant[]
  participantVariants: Array<{ participant_id: string; variant_id: string }>
  gazeData?: LiveWebsiteGazeData[]
}

export interface LiveWebsiteTask {
  id: string
  study_id: string
  title: string
  instructions: string
  target_url: string
  success_url: string | null
  success_criteria_type: 'self_reported' | 'url_match' | 'exact_path'
  success_path: Record<string, unknown> | null
  time_limit_seconds: number | null
  order_position: number
  post_task_questions: unknown
}

export interface LiveWebsiteResponse {
  id: string
  participant_id: string
  task_id: string
  study_id: string
  status: 'completed' | 'abandoned' | 'timed_out' | 'skipped'
  started_at: string | null
  completed_at: string | null
  duration_ms: number | null
  recording_id: string | null
  self_reported_success: boolean | null
  completion_method: string | null
  seq_rating: number | null
  open_ended_feedback: string | null
  variant_id: string | null
}

export interface LiveWebsitePostTaskResponse {
  id: string
  response_id: string
  participant_id: string
  study_id: string
  task_id: string
  question_id: string
  value: unknown
}

export interface LiveWebsiteEvent {
  id: string
  study_id: string
  session_id: string
  participant_id: string | null
  task_id: string | null
  event_type: string
  element_selector: string | null
  coordinates: { x: number; y: number } | null
  viewport_size: { width: number; height: number } | null
  page_url: string | null
  timestamp: string
  metadata: Record<string, unknown> | null
}

export interface LiveWebsitePageScreenshot {
  id: string
  study_id: string
  page_url: string
  screenshot_path: string
  snapshot_path: string | null
  viewport_width: number | null
  viewport_height: number | null
  page_width: number | null
  page_height: number | null
  captured_at: string
}

export interface LiveWebsiteGazeData {
  id: string
  study_id: string
  session_id: string
  participant_id: string | null
  task_id: string | null
  page_url: string | null
  viewport_width: number | null
  viewport_height: number | null
  gaze_points: Array<{ x: number; y: number; t: number }>
  point_count: number
  created_at: string
}

export interface LiveWebsiteRrwebSession {
  id: string
  study_id: string
  session_id: string
  participant_id: string | null
  started_at: string
  ended_at: string | null
  duration_ms: number | null
  page_count: number
  event_count: number
  total_size_bytes: number
  chunks_uploaded: number
  chunk_paths: string[]
  status: 'recording' | 'completed' | 'failed'
  viewport_width: number | null
  viewport_height: number | null
  user_agent: string | null
  created_at: string
  updated_at: string
}

/**
 * Union type for all results data
 */
export type ResultsData = CardSortResultsData | TreeTestResultsData | SurveyResultsData | PrototypeTestResultsData | LiveWebsiteResultsData | import('@/services/results/first-click').FirstClickResultsResponse | import('@/services/results/first-impression').FirstImpressionResultsResponse

/**
 * Type guard for Tree Test results
 */
export function isTreeTestResults(data: ResultsData): data is TreeTestResultsData {
  return data.study.study_type === 'tree_test'
}

/**
 * Type guard for Survey results
 */
export function isSurveyResults(data: ResultsData): data is SurveyResultsData {
  return data.study.study_type === 'survey'
}

/**
 * Type guard for Card Sort results
 */
export function isCardSortResults(data: ResultsData): data is CardSortResultsData {
  return data.study.study_type === 'card_sort'
}

/**
 * Type guard for Prototype Test results
 */
export function isPrototypeTestResults(data: ResultsData): data is PrototypeTestResultsData {
  return data.study.study_type === 'prototype_test'
}

/**
 * Type guard for Live Website Test results
 */
export function isLiveWebsiteResults(data: ResultsData): data is LiveWebsiteResultsData {
  return (data.study as any).study_type === 'live_website_test'
}

/**
 * Type guard for First-Click Test results
 */
export function isFirstClickResults(data: ResultsData): data is import('@/services/results/first-click').FirstClickResultsResponse {
  return (data.study as any).study_type === 'first_click'
}

/**
 * Type guard for First Impression Test results
 */
export function isFirstImpressionResults(data: ResultsData): data is import('@/services/results/first-impression').FirstImpressionResultsResponse {
  return (data.study as any).study_type === 'first_impression'
}

