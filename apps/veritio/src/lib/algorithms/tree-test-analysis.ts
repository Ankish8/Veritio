/**
 * Tree Test Analysis Algorithms
 *
 * Computes key metrics for tree testing studies:
 * - Findability Score: Weighted combination of success (75%) and directness (25%)
 * - Success rate: % of participants who selected the correct answer
 * - Directness rate: % who found the answer without backtracking
 * - First click success: % where the first click was on the correct path
 * - Path analysis: Most common navigation paths
 */

import type { TreeNode, Task } from '@veritio/study-types'
import { castJsonArray } from '../supabase/json-utils'
import {
  type ConfidenceInterval,
  type BoxPlotStats,
  type StatusBreakdown,
  wilsonScoreCI,
  calculateBoxPlotStats,
  calculateTaskScore,
  computeStatusBreakdown,
  buildBreadcrumbPath,
} from './statistics'
import {
  type FindabilityGrade,
  getFindabilityGrade,
} from './findability-score'
import {
  type LostnessStatus,
  type LostnessStats,
  calculateLostness,
  getLostnessStatus,
  calculateLostnessStats,
} from './lostness-score'

// Re-export types from statistics, findability, and lostness for convenience
export type { ConfidenceInterval, BoxPlotStats, StatusBreakdown }
export type { FindabilityGrade }
export type { LostnessStatus, LostnessStats }

export interface TreeTestResponse {
  id: string
  participant_id: string
  task_id: string
  path_taken: string[]
  selected_node_id: string | null
  is_correct: boolean | null
  is_direct: boolean | null
  is_skipped: boolean | null
  time_to_first_click_ms: number | null
  total_time_ms: number | null
  backtrack_count: number
}

export interface Participant {
  id: string
  status: string
  started_at: string
  completed_at: string | null
}

export interface PathFrequency {
  path: string[]
  pathLabels: string[]
  count: number
  percentage: number
  isSuccessPath: boolean
}

export interface WrongAnswerFrequency {
  nodeId: string
  nodeLabel: string
  nodePath: string
  count: number
  percentage: number
}

export interface FirstClickData {
  nodeId: string
  nodeLabel: string
  count: number
  percentage: number
  isOnCorrectPath: boolean
}

export interface DestinationCount {
  nodeId: string
  count: number
  percentage: number
  isCorrect: boolean
}

export interface TaskMetrics {
  taskId: string
  question: string
  correctNodeId: string | null // Deprecated - use correctNodeIds
  correctNodeIds: string[]
  correctNodeLabel: string // Deprecated - use correctNodeLabels
  correctNodeLabels: string[]
  responseCount: number
  successRate: number
  directnessRate: number
  directSuccessRate: number
  firstClickSuccessRate: number
  averageTimeMs: number
  averagePathLength: number
  averageBacktracks: number
  commonPaths: PathFrequency[]
  commonWrongAnswers: WrongAnswerFrequency[]
  firstClickData: FirstClickData[]
  // Extended metrics for Task Results view
  skipCount: number
  skipRate: number
  statusBreakdown: StatusBreakdown
  successCI: ConfidenceInterval
  directnessCI: ConfidenceInterval
  timeBoxPlot: BoxPlotStats
  /** Findability score on 0-10 scale (formerly "Task Score") */
  taskScore: number
  /** Findability grade (A+, A, B, C, D, F) based on taskScore */
  findabilityGrade: FindabilityGrade
  /** Human-readable description of the grade */
  findabilityGradeDescription: string
  correctPathBreadcrumb: string[]
  /** Average lostness score for this task (0 = perfect, higher = more lost) */
  averageLostness: number
  /** Lostness status classification based on average */
  lostnessStatus: LostnessStatus
  /** Human-readable description of lostness status */
  lostnessDescription: string
  /** Full lostness statistics including distribution */
  lostnessStats: LostnessStats
  /** Destination counts for Destinations Overview */
  destinationCounts: DestinationCount[]
}

export interface OverallMetrics {
  totalParticipants: number
  completedParticipants: number
  completionRate: number
  overallSuccessRate: number
  overallDirectnessRate: number
  overallDirectSuccessRate: number
  /** Overall findability score on 0-100 scale (formerly "Overall Score") */
  overallScore: number
  /** Overall findability grade (A+, A, B, C, D, F) based on overallScore */
  overallFindabilityGrade: FindabilityGrade
  /** Human-readable description of the overall grade */
  overallFindabilityGradeDescription: string
  averageCompletionTimeMs: number
  /** Overall average lostness score across all tasks */
  overallLostness: number
  /** Overall lostness status classification */
  overallLostnessStatus: LostnessStatus
  /** Human-readable description of overall lostness */
  overallLostnessDescription: string
  taskMetrics: TaskMetrics[]
}

// Utility functions

function sum(numbers: number[]): number {
  return numbers.reduce((acc, n) => acc + n, 0)
}

function average(numbers: number[]): number {
  if (numbers.length === 0) return 0
  return sum(numbers) / numbers.length
}

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  return a.every((val, idx) => val === b[idx])
}

/**
 * Build a TaskMetrics object for a task with zero responses.
 */
function buildEmptyTaskMetrics(
  task: Task,
  correctNodeIds: string[],
  correctNodeLabel: string,
  correctNodeLabels: string[],
  correctPathBreadcrumb: string[]
): TaskMetrics {
  return {
    taskId: task.id,
    question: task.question,
    correctNodeId: task.correct_node_id,
    correctNodeIds,
    correctNodeLabel,
    correctNodeLabels,
    responseCount: 0,
    successRate: 0,
    directnessRate: 0,
    directSuccessRate: 0,
    firstClickSuccessRate: 0,
    averageTimeMs: 0,
    averagePathLength: 0,
    averageBacktracks: 0,
    commonPaths: [],
    commonWrongAnswers: [],
    firstClickData: [],
    skipCount: 0,
    skipRate: 0,
    statusBreakdown: {
      success: { direct: 0, indirect: 0, total: 0 },
      fail: { direct: 0, indirect: 0, total: 0 },
      skip: { direct: 0, indirect: 0, total: 0 },
    },
    successCI: { lowerBound: 0, upperBound: 0, level: 0.95 },
    directnessCI: { lowerBound: 0, upperBound: 0, level: 0.95 },
    timeBoxPlot: { min: 0, q1: 0, median: 0, q3: 0, max: 0, outliers: [] },
    taskScore: 0,
    findabilityGrade: 'F',
    findabilityGradeDescription: 'No responses',
    correctPathBreadcrumb,
    averageLostness: 0,
    lostnessStatus: 'perfect',
    lostnessDescription: 'No data',
    lostnessStats: {
      average: 0,
      median: 0,
      min: 0,
      max: 0,
      averageStatus: 'perfect',
      averageDescription: 'No data',
      distribution: { perfect: 0, good: 0, acceptable: 0, problematic: 0, lost: 0 },
    },
    destinationCounts: [],
  }
}

/**
 * Compute all tree test metrics
 */
export function computeTreeTestMetrics(
  tasks: Task[],
  nodes: TreeNode[],
  responses: TreeTestResponse[],
  participants: Participant[]
): OverallMetrics {
  const totalParticipants = participants.length
  const completedParticipants = participants.filter(
    (p) => p.status === 'completed'
  ).length
  const completionRate =
    totalParticipants > 0 ? (completedParticipants / totalParticipants) * 100 : 0

  // Build node lookup map once -- eliminates O(n) find() calls per node access
  const nodeMap = new Map(nodes.map((n) => [n.id, n]))

  // Share path cache across all tasks (same tree structure)
  const sharedPathCache = new Map<string, string[]>()

  // Compute per-task metrics
  const taskMetrics = tasks.map((task) => {
    const taskResponses = responses.filter((r) => r.task_id === task.id)
    return computeTaskMetrics(task, nodes, taskResponses, nodeMap, sharedPathCache)
  })

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

  return {
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
}

/**
 * Get correct node IDs from task (supports both old single and new array format)
 */
function getCorrectNodeIds(task: Task): string[] {
  // Prefer correct_node_ids array, fall back to single correct_node_id
  const ids = castJsonArray<string>(task.correct_node_ids)
  if (ids.length > 0) return ids
  return task.correct_node_id ? [task.correct_node_id] : []
}

/**
 * Compute destination counts for a task
 * Returns which nodes participants selected and how many times
 */
function computeDestinationCounts(
  responses: TreeTestResponse[],
  correctNodeIds: string[],
  totalResponses: number
): DestinationCount[] {
  // Count selections per node
  const nodeCounts = new Map<string, number>()

  for (const response of responses) {
    if (response.selected_node_id) {
      const current = nodeCounts.get(response.selected_node_id) || 0
      nodeCounts.set(response.selected_node_id, current + 1)
    }
  }

  // Convert to array with percentages
  const correctSet = new Set(correctNodeIds)
  const destinations: DestinationCount[] = []

  for (const [nodeId, count] of nodeCounts) {
    destinations.push({
      nodeId,
      count,
      percentage: totalResponses > 0 ? Math.round((count / totalResponses) * 100) : 0,
      isCorrect: correctSet.has(nodeId),
    })
  }

  // Sort by count descending
  destinations.sort((a, b) => b.count - a.count)

  return destinations
}

export function computeTaskMetrics(
  task: Task,
  nodes: TreeNode[],
  responses: TreeTestResponse[],
  nodeMap?: Map<string, TreeNode>,
  pathCache?: Map<string, string[]>
): TaskMetrics {
  const responseCount = responses.length

  // Use provided nodeMap or build one (when called standalone)
  const lookupMap = nodeMap ?? new Map(nodes.map((n) => [n.id, n]))
  const cache = pathCache ?? new Map<string, string[]>()

  // Get all correct node IDs (supports both single and multi)
  const correctNodeIds = getCorrectNodeIds(task)

  // Find correct node labels using map lookup
  const correctNodeLabels = correctNodeIds
    .map((id) => lookupMap.get(id))
    .filter((n): n is TreeNode => n !== undefined)
    .map((n) => n.label)

  // Legacy single values for backward compatibility
  const correctNodeLabel = correctNodeLabels.length > 0
    ? correctNodeLabels.join(', ')
    : 'Not specified'

  // Build correct path breadcrumb from first correct node
  const correctPathBreadcrumb = correctNodeIds.length > 0
    ? buildBreadcrumbPath(nodes, correctNodeIds[0])
    : []

  if (responseCount === 0) {
    return buildEmptyTaskMetrics(task, correctNodeIds, correctNodeLabel, correctNodeLabels, correctPathBreadcrumb)
  }

  // Pre-compute correct paths once (used by first-click, commonPaths, commonWrongAnswers, firstClickData, lostness)
  const correctPaths = correctNodeIds.map((id) => calculatePathToNode(nodes, id, cache, lookupMap))

  // Success rate (null is treated as false)
  const successCount = responses.filter((r) => r.is_correct === true).length
  const successRate = (successCount / responseCount) * 100

  // Directness rate (among all responses, null is treated as false)
  const directCount = responses.filter((r) => r.is_direct === true).length
  const directnessRate = (directCount / responseCount) * 100

  // Direct success rate (correct AND direct)
  const directSuccessCount = responses.filter(
    (r) => r.is_correct === true && r.is_direct === true
  ).length
  const directSuccessRate = (directSuccessCount / responseCount) * 100

  // First click success rate - check if first click is on path to ANY correct node
  const firstClickSuccessCount = responses.filter((r) => {
    if (r.path_taken.length === 0) return false
    const firstClick = r.path_taken[0]
    return correctPaths.some((path) => path.includes(firstClick))
  }).length
  const firstClickSuccessRate = (firstClickSuccessCount / responseCount) * 100

  // Average timing
  const validTimes = responses
    .filter((r) => r.total_time_ms !== null)
    .map((r) => r.total_time_ms as number)
  const averageTimeMs =
    validTimes.length > 0 ? sum(validTimes) / validTimes.length : 0

  // Average path length
  const pathLengths = responses.map((r) => r.path_taken.length)
  const averagePathLength = sum(pathLengths) / responseCount

  // Average backtracks
  const backtracks = responses.map((r) => r.backtrack_count)
  const averageBacktracks = sum(backtracks) / responseCount

  // Common paths
  const commonPaths = findCommonPaths(responses, nodes, correctNodeIds, 5, cache, lookupMap)

  // Common wrong answers
  const commonWrongAnswers = findCommonWrongAnswers(
    responses,
    nodes,
    correctNodeIds,
    5,
    cache,
    lookupMap,
  )

  // First click data
  const firstClickData = computeFirstClickData(
    responses,
    nodes,
    correctNodeIds,
    cache,
    lookupMap,
  )

  // Extended metrics calculations
  const skipCount = responses.filter((r) => r.is_skipped === true).length
  const skipRate = (skipCount / responseCount) * 100

  // Status breakdown (direct/indirect for success, fail, skip)
  const statusBreakdown = computeStatusBreakdown(responses)

  // Confidence intervals for success and directness
  const successCI = wilsonScoreCI(successCount, responseCount)
  const directnessCI = wilsonScoreCI(directCount, responseCount)

  // Box plot statistics for time taken
  const timeBoxPlot = calculateBoxPlotStats(validTimes)

  // Findability score (0-10 scale) and grade
  const taskScore = calculateTaskScore(successRate, directnessRate)
  const { grade: findabilityGrade, gradeDescription: findabilityGradeDescription } =
    getFindabilityGrade(taskScore)

  // Lostness: use pre-computed correctPaths to get optimal path lengths
  const optimalPathLengths = correctPaths.map((path) => path.length + 1)
  const shortestOptimalPath = optimalPathLengths.length > 0
    ? Math.min(...optimalPathLengths)
    : 1

  const lostnessScores = responses
    .filter((r) => r.path_taken.length > 0)
    .map((r) => calculateLostness({
      pathTaken: r.path_taken,
      optimalPathLength: shortestOptimalPath,
    }))

  const lostnessStats = calculateLostnessStats(lostnessScores)
  const { status: lostnessStatus, description: lostnessDescription } =
    getLostnessStatus(lostnessStats.average)

  // Compute destination counts (which nodes were selected)
  const destinationCounts = computeDestinationCounts(responses, correctNodeIds, responseCount)

  return {
    taskId: task.id,
    question: task.question,
    correctNodeId: task.correct_node_id,
    correctNodeIds,
    correctNodeLabel,
    correctNodeLabels,
    responseCount,
    successRate,
    directnessRate,
    directSuccessRate,
    firstClickSuccessRate,
    averageTimeMs,
    averagePathLength,
    averageBacktracks,
    commonPaths,
    commonWrongAnswers,
    firstClickData,
    skipCount,
    skipRate,
    statusBreakdown,
    successCI,
    directnessCI,
    timeBoxPlot,
    taskScore,
    findabilityGrade,
    findabilityGradeDescription,
    correctPathBreadcrumb,
    averageLostness: lostnessStats.average,
    lostnessStatus,
    lostnessDescription,
    lostnessStats,
    destinationCounts,
  }
}

/**
 * Find most common navigation paths
 */
export function findCommonPaths(
  responses: TreeTestResponse[],
  nodes: TreeNode[],
  correctNodeIds: string[],
  limit: number = 5,
  pathCache?: Map<string, string[]>,
  nodeMap?: Map<string, TreeNode>
): PathFrequency[] {
  if (responses.length === 0) return []

  const lookupMap = nodeMap ?? new Map(nodes.map((n) => [n.id, n]))

  // Count path frequencies
  const pathCounts = new Map<string, { path: string[]; count: number }>()

  for (const response of responses) {
    const pathKey = response.path_taken.join(' > ')
    const existing = pathCounts.get(pathKey)

    if (existing) {
      existing.count++
    } else {
      pathCounts.set(pathKey, { path: [...response.path_taken], count: 1 })
    }
  }

  // Sort by count and take top N
  const sorted = Array.from(pathCounts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)

  const correctPaths = correctNodeIds.map((id) => calculatePathToNode(nodes, id, pathCache, lookupMap))

  return sorted.map((item) => ({
    path: item.path,
    pathLabels: item.path.map(
      (id) => lookupMap.get(id)?.label || 'Unknown'
    ),
    count: item.count,
    percentage: (item.count / responses.length) * 100,
    isSuccessPath: correctPaths.some((correctPath) => arraysEqual(item.path, correctPath)),
  }))
}

/**
 * Find most common incorrect answers
 */
export function findCommonWrongAnswers(
  responses: TreeTestResponse[],
  nodes: TreeNode[],
  correctNodeIds: string[],
  limit: number = 5,
  pathCache?: Map<string, string[]>,
  nodeMap?: Map<string, TreeNode>
): WrongAnswerFrequency[] {
  const correctSet = new Set(correctNodeIds)
  const wrongResponses = responses.filter(
    (r) => r.is_correct !== true && r.selected_node_id && !correctSet.has(r.selected_node_id)
  )

  if (wrongResponses.length === 0) return []

  const lookupMap = nodeMap ?? new Map(nodes.map((n) => [n.id, n]))

  // Count wrong answer frequencies
  const counts = new Map<string, number>()

  for (const response of wrongResponses) {
    if (!response.selected_node_id) continue
    counts.set(
      response.selected_node_id,
      (counts.get(response.selected_node_id) || 0) + 1
    )
  }

  // Sort and take top N
  const sorted = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)

  return sorted.map(([nodeId, count]) => {
    const pathToNode = calculatePathToNode(nodes, nodeId, pathCache, lookupMap)
    const pathLabels = pathToNode.map(
      (id) => lookupMap.get(id)?.label || 'Unknown'
    )

    return {
      nodeId,
      nodeLabel: lookupMap.get(nodeId)?.label || 'Unknown',
      nodePath: pathLabels.join(' > '),
      count,
      percentage: (count / responses.length) * 100,
    }
  })
}

/**
 * Compute first click distribution
 */
export function computeFirstClickData(
  responses: TreeTestResponse[],
  nodes: TreeNode[],
  correctNodeIds: string[],
  pathCache?: Map<string, string[]>,
  nodeMap?: Map<string, TreeNode>
): FirstClickData[] {
  const responsesWithPath = responses.filter((r) => r.path_taken.length > 0)

  if (responsesWithPath.length === 0) return []

  const lookupMap = nodeMap ?? new Map(nodes.map((n) => [n.id, n]))
  const correctPaths = correctNodeIds.map((id) => calculatePathToNode(nodes, id, pathCache, lookupMap))

  // Count first clicks
  const counts = new Map<string, number>()

  for (const response of responsesWithPath) {
    const firstClick = response.path_taken[0]
    counts.set(firstClick, (counts.get(firstClick) || 0) + 1)
  }

  return Array.from(counts.entries())
    .map(([nodeId, count]) => {
      const isOnCorrectPath = correctPaths.some(
        (path) => path.length > 0 && path[0] === nodeId
      )
      return {
        nodeId,
        nodeLabel: lookupMap.get(nodeId)?.label || 'Unknown',
        count,
        percentage: (count / responsesWithPath.length) * 100,
        isOnCorrectPath,
      }
    })
    .sort((a, b) => b.count - a.count)
}

/**
 * Calculate the path from root to a given node.
 * Optionally accepts a cache to avoid recomputation and a nodeMap for O(1) lookups.
 */
export function calculatePathToNode(
  nodes: TreeNode[],
  nodeId: string,
  cache?: Map<string, string[]>,
  nodeMap?: Map<string, TreeNode>
): string[] {
  if (cache) {
    const cached = cache.get(nodeId)
    if (cached) return cached
  }

  const lookupMap = nodeMap ?? new Map(nodes.map((n) => [n.id, n]))
  const path: string[] = []
  let currentId: string | null = nodeId

  // Walk up the tree
  while (currentId) {
    const node = lookupMap.get(currentId)
    if (!node) break

    // Only include nodes that have a parent (don't include the selected node in the path)
    if (node.parent_id) {
      path.unshift(node.parent_id)
    }

    currentId = node.parent_id
  }

  if (cache) {
    cache.set(nodeId, path)
  }

  return path
}
