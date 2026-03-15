/**
 * Web Worker for Tree Test Metrics Computation
 *
 * This worker runs heavy computations off the main thread to prevent UI blocking.
 * The computeTreeTestMetrics function processes 1000s of responses and can take
 * 2-4 seconds - running this in a worker keeps the UI responsive.
 *
 * Usage:
 * - Main thread sends: { type: 'compute', payload: { tasks, nodes, responses, participants } }
 * - Worker posts back: { type: 'progress' | 'result' | 'error', ... }
 */

import type { TreeNode, Task } from '@veritio/study-types'
import type {
  TreeTestResponse,
  Participant,
  OverallMetrics,
} from '@/lib/algorithms/tree-test-analysis'
import {
  computeTreeTestMetrics,
  computeTaskMetrics,
} from '@/lib/algorithms/tree-test-analysis'
import { getFindabilityGrade } from '@/lib/algorithms/findability-score'
import { getLostnessStatus } from '@/lib/algorithms/lostness-score'

// ============================================================================
// Message Types
// ============================================================================

export interface MetricsWorkerInput {
  type: 'compute'
  payload: {
    tasks: Task[]
    nodes: TreeNode[]
    responses: TreeTestResponse[]
    participants: Participant[]
  }
}

export interface MetricsWorkerProgress {
  type: 'progress'
  progress: number // 0-100
  currentTask?: string
}

export interface MetricsWorkerResult {
  type: 'result'
  data: OverallMetrics
}

export interface MetricsWorkerError {
  type: 'error'
  error: string
}

export type MetricsWorkerOutput =
  | MetricsWorkerProgress
  | MetricsWorkerResult
  | MetricsWorkerError

// ============================================================================
// Worker Entry Point
// ============================================================================

self.onmessage = (event: MessageEvent<MetricsWorkerInput>) => {
  const { type, payload } = event.data

  if (type !== 'compute') {
    self.postMessage({
      type: 'error',
      error: `Unknown message type: ${type}`,
    } satisfies MetricsWorkerError)
    return
  }

  try {
    const { tasks, nodes, responses, participants } = payload

    // Validate input
    if (!tasks || !nodes || !responses || !participants) {
      throw new Error('Missing required input data')
    }

    // For small datasets, compute all at once (faster than chunking overhead)
    if (tasks.length <= 3 || responses.length < 100) {
      const result = computeTreeTestMetrics(tasks, nodes, responses, participants)
      self.postMessage({
        type: 'result',
        data: result,
      } satisfies MetricsWorkerResult)
      return
    }

    // For larger datasets, compute with progress reporting
    computeWithProgress(tasks, nodes, responses, participants)
  } catch (error) {
    self.postMessage({
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error during computation',
    } satisfies MetricsWorkerError)
  }
}

// ============================================================================
// Progressive Computation
// ============================================================================

/**
 * Compute metrics with progress reporting for each task.
 * This allows the UI to show a progress indicator for large datasets.
 */
function computeWithProgress(
  tasks: Task[],
  nodes: TreeNode[],
  responses: TreeTestResponse[],
  participants: Participant[]
): void {
  const totalParticipants = participants.length
  const completedParticipants = participants.filter(
    (p) => p.status === 'completed'
  ).length
  const completionRate =
    totalParticipants > 0 ? (completedParticipants / totalParticipants) * 100 : 0

  // Report initial progress
  self.postMessage({
    type: 'progress',
    progress: 0,
    currentTask: 'Starting computation...',
  } satisfies MetricsWorkerProgress)

  // Compute per-task metrics with progress reporting
  const taskMetrics = tasks.map((task, index) => {
    // Report progress before computing each task
    self.postMessage({
      type: 'progress',
      progress: Math.round(((index) / tasks.length) * 90), // Reserve last 10% for aggregation
      currentTask: `Processing task ${index + 1} of ${tasks.length}`,
    } satisfies MetricsWorkerProgress)

    const taskResponses = responses.filter((r) => r.task_id === task.id)
    return computeTaskMetrics(task, nodes, taskResponses)
  })

  // Report aggregation phase
  self.postMessage({
    type: 'progress',
    progress: 90,
    currentTask: 'Aggregating results...',
  } satisfies MetricsWorkerProgress)

  // Aggregate overall metrics
  const allSuccessRates = taskMetrics.map((t) => t.successRate)
  const allDirectnessRates = taskMetrics.map((t) => t.directnessRate)
  const allDirectSuccessRates = taskMetrics.map((t) => t.directSuccessRate)

  const overallSuccessRate = average(allSuccessRates)
  const overallDirectnessRate = average(allDirectnessRates)
  const overallDirectSuccessRate = average(allDirectSuccessRates)

  // Overall findability score: weighted combination (success * 3 + directness) / 4
  const overallScore = (overallSuccessRate * 3 + overallDirectnessRate) / 4

  // Compute overall findability grade (convert 0-100 to 0-10 scale for grading)
  const { grade: overallFindabilityGrade, gradeDescription: overallFindabilityGradeDescription } =
    getFindabilityGrade(overallScore / 10)

  // Average completion time across all tasks
  const validTimes = responses
    .filter((r) => r.total_time_ms !== null)
    .map((r) => r.total_time_ms as number)
  const averageCompletionTimeMs =
    validTimes.length > 0 ? sum(validTimes) / validTimes.length : 0

  // Overall lostness: average of task-level average lostness scores
  const allLostnessScores = taskMetrics.map((t) => t.averageLostness)
  const overallLostness = allLostnessScores.length > 0
    ? Math.round((sum(allLostnessScores) / allLostnessScores.length) * 100) / 100
    : 0
  const { status: overallLostnessStatus, description: overallLostnessDescription } =
    getLostnessStatus(overallLostness)

  const result: OverallMetrics = {
    totalParticipants,
    completedParticipants,
    completionRate,
    overallSuccessRate,
    overallDirectnessRate,
    overallDirectSuccessRate,
    overallScore,
    overallFindabilityGrade,
    overallFindabilityGradeDescription,
    averageCompletionTimeMs,
    overallLostness,
    overallLostnessStatus,
    overallLostnessDescription,
    taskMetrics,
  }

  // Report completion
  self.postMessage({
    type: 'progress',
    progress: 100,
    currentTask: 'Complete',
  } satisfies MetricsWorkerProgress)

  self.postMessage({
    type: 'result',
    data: result,
  } satisfies MetricsWorkerResult)
}

// ============================================================================
// Utility Functions (copied from tree-test-analysis to avoid import issues)
// ============================================================================

function sum(numbers: number[]): number {
  return numbers.reduce((acc, n) => acc + n, 0)
}

function average(numbers: number[]): number {
  if (numbers.length === 0) return 0
  return sum(numbers) / numbers.length
}
