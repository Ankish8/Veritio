import type { CategoryStandardization } from '@veritio/study-types'
import type {
  computeSimilarityMatrix,
  getTopSimilarPairs,
  findNaturalClusters,
} from '../../lib/algorithms/similarity-matrix'
import type {
  buildDendrogram,
  suggestClusterCount,
  LinkageMethod,
} from '../../lib/algorithms/hierarchical-clustering'
import type { computeTreeTestMetrics } from '../../lib/algorithms/tree-test-analysis'
import type { computePrototypeTestMetrics } from '../../lib/algorithms/prototype-test-analysis'

export interface StudyBase {
  id: string
  title: string
  description: string | null
  status: string | null
  share_code: string | null
  settings?: unknown // Optional - may not be included in results endpoints
  launched_at: string | null
  created_at: string | null
}

export interface BasicStats {
  totalParticipants: number
  completedParticipants: number
  abandonedParticipants: number
  completionRate: number
  avgCompletionTimeMs: number
}

export interface CardSortResultsResponse {
  study: StudyBase & { study_type: string }
  cards: Array<{ id: string; label: string; position?: number }>
  categories: unknown[]
  stats: BasicStats
  responses: unknown[]
  participants: unknown[]
  analysis: {
    similarityMatrix: ReturnType<typeof computeSimilarityMatrix>
    dendrogram: ReturnType<typeof buildDendrogram>
    dendrogramMethod?: LinkageMethod
    optimalOrder: string[]
    suggestedClusters: ReturnType<typeof suggestClusterCount>
    topSimilarPairs: ReturnType<typeof getTopSimilarPairs>
    naturalClusters: ReturnType<typeof findNaturalClusters>
    categoryAgreement: Record<string, CategoryAgreement>
  } | null
  standardizations: CategoryStandardization[]
  flowQuestions: unknown[]
  flowResponses: unknown[]
}

export interface CategoryAgreement {
  cardLabel: string
  categories: Array<{
    name: string
    count: number
    percentage: number
  }>
}

export interface TreeTestResultsResponse {
  study: StudyBase & { study_type: 'tree_test' }
  tasks: unknown[]
  nodes: unknown[]
  responses: unknown[]
  postTaskResponses: unknown[]
  participants: unknown[]
  metrics: ReturnType<typeof computeTreeTestMetrics>
  flowQuestions: unknown[]
  flowResponses: unknown[]
}

export interface SurveyResultsResponse {
  study: StudyBase & { study_type: 'survey' }
  stats: BasicStats
  participants: unknown[]
  flowQuestions: unknown[]
  flowResponses: unknown[]
}

export interface PrototypeTestResultsResponse {
  study: StudyBase & { study_type: 'prototype_test' }
  prototype: unknown | null
  tasks: unknown[]
  frames: unknown[]
  taskAttempts: unknown[]
  postTaskResponses: unknown[]
  sessions: unknown[]
  participants: unknown[]
  metrics: ReturnType<typeof computePrototypeTestMetrics>
  flowQuestions: unknown[]
  flowResponses: unknown[]
  componentStateEvents: unknown[]
}

export interface ServiceResult<T> {
  data: T | null
  error: Error | null
}
