import type {
  PrototypeTestTask,
  PrototypeTestTaskAttempt,
  Participant,
} from '@veritio/prototype-test/lib/supabase/study-flow-types'
import { castJsonArray } from '@veritio/core/database'
import {
  type ConfidenceInterval,
  type BoxPlotStats,
  wilsonScoreCI,
  calculateBoxPlotStats,
  calculateTaskScore,
} from '../lib/algorithms/statistics'

export type { ConfidenceInterval, BoxPlotStats }

export interface PrototypeStatusBreakdown {
  success: { direct: number; indirect: number; total: number }
  failure: { direct: number; indirect: number; total: number }
  skipped: { direct: number; indirect: number; total: number }
  abandoned: { direct: number; indirect: number; total: number }
}

export type TaskOutcome = 'success' | 'failure' | 'skipped' | 'abandoned'

export interface ParsedTaskAttempt {
  id: string
  participant_id: string
  task_id: string
  session_id: string
  outcome: TaskOutcome
  total_time_ms: number | null
  time_to_first_click_ms: number | null
  click_count: number
  misclick_count: number
  backtrack_count: number
  is_direct: boolean
  path_taken: string[]
  post_task_responses: Record<string, unknown>[]
}

export interface PrototypeTaskMetrics {
  taskId: string
  taskTitle: string
  taskInstruction: string | null
  responseCount: number
  successCount: number
  failureCount: number
  skippedCount: number
  abandonedCount: number
  successRate: number
  failureRate: number
  skippedRate: number
  abandonedRate: number
  directRate: number
  directSuccessRate: number
  averageTimeMs: number
  averageTimeToFirstClickMs: number
  averageClickCount: number
  averageMisclickCount: number
  averageBacktrackCount: number
  misclickRate: number
  successCI: ConfidenceInterval
  directnessCI: ConfidenceInterval
  timeBoxPlot: BoxPlotStats
  statusBreakdown: PrototypeStatusBreakdown
  taskScore: number
}

export interface PrototypeTestMetrics {
  totalParticipants: number
  completedParticipants: number
  abandonedParticipants: number
  inProgressParticipants: number
  completionRate: number
  averageCompletionTimeMs: number
  participantTaskTimes: number[]
  totalTasks: number
  overallSuccessRate: number
  overallDirectRate: number
  overallDirectSuccessRate: number
  averageClickCount: number
  averageMisclickCount: number
  averageMisclickRate: number
  taskMetrics: PrototypeTaskMetrics[]
}

export interface ParticipantTaskSummary {
  participantId: string
  totalTasks: number
  completedCount: number
  skippedCount: number
  successfulCount: number
  totalTimeMs: number
  totalQuestionResponses: number
  flowQuestionResponses: number
  postTaskQuestionResponses: number
}

export function parseTaskAttempt(
  attempt: PrototypeTestTaskAttempt
): ParsedTaskAttempt {
  return {
    id: attempt.id,
    participant_id: attempt.participant_id,
    task_id: attempt.task_id,
    session_id: attempt.session_id,
    outcome: attempt.outcome as TaskOutcome,
    total_time_ms: attempt.total_time_ms,
    time_to_first_click_ms: attempt.time_to_first_click_ms,
    click_count: attempt.click_count ?? 0,
    misclick_count: attempt.misclick_count ?? 0,
    backtrack_count: attempt.backtrack_count ?? 0,
    is_direct: attempt.is_direct ?? false,
    path_taken: castJsonArray<string>(attempt.path_taken),
    post_task_responses: castJsonArray<Record<string, unknown>>(
      attempt.post_task_responses
    ),
  }
}

export function computePrototypeTestMetrics(
  tasks: PrototypeTestTask[],
  taskAttempts: PrototypeTestTaskAttempt[],
  participants: Participant[]
): PrototypeTestMetrics {
  const parsedAttempts = taskAttempts.map(parseTaskAttempt)

  const totalParticipants = participants.length
  const completedParticipants = participants.filter(
    (p) => p.status === 'completed'
  ).length
  const abandonedParticipants = participants.filter(
    (p) => p.status === 'abandoned'
  ).length
  const inProgressParticipants = participants.filter(
    (p) => p.status === 'in_progress'
  ).length
  const completionRate =
    totalParticipants > 0 ? (completedParticipants / totalParticipants) * 100 : 0

  const participantTaskTimes = new Map<string, number>()
  for (const attempt of parsedAttempts) {
    if (attempt.total_time_ms && attempt.total_time_ms > 0) {
      const current = participantTaskTimes.get(attempt.participant_id) || 0
      participantTaskTimes.set(attempt.participant_id, current + attempt.total_time_ms)
    }
  }
  const completionTimes = Array.from(participantTaskTimes.values()).filter((t) => t > 0)
  const averageCompletionTimeMs =
    completionTimes.length > 0 ? sum(completionTimes) / completionTimes.length : 0

  const taskMetrics = tasks.map((task) => {
    const taskAttempts = parsedAttempts.filter((a) => a.task_id === task.id)
    return computeTaskMetrics(task, taskAttempts)
  })

  const allAttempts = parsedAttempts.filter(
    (a) => a.outcome !== 'skipped'
  )
  const successCount = parsedAttempts.filter((a) => a.outcome === 'success').length
  const directCount = parsedAttempts.filter((a) => a.is_direct).length
  const directSuccessCount = parsedAttempts.filter(
    (a) => a.outcome === 'success' && a.is_direct
  ).length

  const totalAttempts = parsedAttempts.length
  const overallSuccessRate =
    totalAttempts > 0 ? (successCount / totalAttempts) * 100 : 0
  const overallDirectRate =
    totalAttempts > 0 ? (directCount / totalAttempts) * 100 : 0
  const overallDirectSuccessRate =
    totalAttempts > 0 ? (directSuccessCount / totalAttempts) * 100 : 0

  const totalClicks = sum(allAttempts.map((a) => a.click_count))
  const totalMisclicks = sum(allAttempts.map((a) => a.misclick_count))
  const averageClickCount =
    allAttempts.length > 0 ? totalClicks / allAttempts.length : 0
  const averageMisclickCount =
    allAttempts.length > 0 ? totalMisclicks / allAttempts.length : 0
  const averageMisclickRate =
    totalClicks > 0 ? (totalMisclicks / totalClicks) * 100 : 0

  return {
    totalParticipants,
    completedParticipants,
    abandonedParticipants,
    inProgressParticipants,
    completionRate,
    averageCompletionTimeMs,
    participantTaskTimes: completionTimes,
    totalTasks: tasks.length,
    overallSuccessRate,
    overallDirectRate,
    overallDirectSuccessRate,
    averageClickCount,
    averageMisclickCount,
    averageMisclickRate,
    taskMetrics,
  }
}

export function computeTaskMetrics(
  task: PrototypeTestTask,
  attempts: ParsedTaskAttempt[]
): PrototypeTaskMetrics {
  const responseCount = attempts.length

  if (responseCount === 0) {
    return createEmptyTaskMetrics(task)
  }

  const successCount = attempts.filter((a) => a.outcome === 'success').length
  const failureCount = attempts.filter((a) => a.outcome === 'failure').length
  const skippedCount = attempts.filter((a) => a.outcome === 'skipped').length
  const abandonedCount = attempts.filter((a) => a.outcome === 'abandoned').length

  const successRate = (successCount / responseCount) * 100
  const failureRate = (failureCount / responseCount) * 100
  const skippedRate = (skippedCount / responseCount) * 100
  const abandonedRate = (abandonedCount / responseCount) * 100

  const completedAttempts = attempts.filter(
    (a) => a.outcome === 'success' || a.outcome === 'failure'
  )
  const directCount = completedAttempts.filter((a) => a.is_direct).length
  const directRate =
    completedAttempts.length > 0
      ? (directCount / completedAttempts.length) * 100
      : 0

  const directSuccessCount = attempts.filter(
    (a) => a.outcome === 'success' && a.is_direct
  ).length
  const directSuccessRate = (directSuccessCount / responseCount) * 100

  const validTimes = completedAttempts
    .filter((a) => a.total_time_ms !== null && a.total_time_ms > 0)
    .map((a) => a.total_time_ms as number)
  const averageTimeMs =
    validTimes.length > 0 ? sum(validTimes) / validTimes.length : 0

  const validFirstClickTimes = completedAttempts
    .filter(
      (a) => a.time_to_first_click_ms !== null && a.time_to_first_click_ms > 0
    )
    .map((a) => a.time_to_first_click_ms as number)
  const averageTimeToFirstClickMs =
    validFirstClickTimes.length > 0
      ? sum(validFirstClickTimes) / validFirstClickTimes.length
      : 0

  const averageClickCount =
    completedAttempts.length > 0
      ? sum(completedAttempts.map((a) => a.click_count)) / completedAttempts.length
      : 0
  const averageMisclickCount =
    completedAttempts.length > 0
      ? sum(completedAttempts.map((a) => a.misclick_count)) /
        completedAttempts.length
      : 0
  const averageBacktrackCount =
    completedAttempts.length > 0
      ? sum(completedAttempts.map((a) => a.backtrack_count)) /
        completedAttempts.length
      : 0

  const totalClicks = sum(completedAttempts.map((a) => a.click_count))
  const totalMisclicks = sum(completedAttempts.map((a) => a.misclick_count))
  const misclickRate = totalClicks > 0 ? (totalMisclicks / totalClicks) * 100 : 0

  const successCI = wilsonScoreCI(successCount, responseCount)
  const directnessCI = wilsonScoreCI(
    directCount,
    completedAttempts.length > 0 ? completedAttempts.length : 1
  )

  const timeBoxPlot = calculateBoxPlotStats(validTimes)
  const statusBreakdown = computePrototypeStatusBreakdown(attempts)
  const taskScore = calculateTaskScore(successRate, directRate)

  return {
    taskId: task.id,
    taskTitle: task.title,
    taskInstruction: task.instruction,
    responseCount,
    successCount,
    failureCount,
    skippedCount,
    abandonedCount,
    successRate,
    failureRate,
    skippedRate,
    abandonedRate,
    directRate,
    directSuccessRate,
    averageTimeMs,
    averageTimeToFirstClickMs,
    averageClickCount,
    averageMisclickCount,
    averageBacktrackCount,
    misclickRate,
    successCI,
    directnessCI,
    timeBoxPlot,
    statusBreakdown,
    taskScore,
  }
}

function createEmptyTaskMetrics(task: PrototypeTestTask): PrototypeTaskMetrics {
  return {
    taskId: task.id,
    taskTitle: task.title,
    taskInstruction: task.instruction,
    responseCount: 0,
    successCount: 0,
    failureCount: 0,
    skippedCount: 0,
    abandonedCount: 0,
    successRate: 0,
    failureRate: 0,
    skippedRate: 0,
    abandonedRate: 0,
    directRate: 0,
    directSuccessRate: 0,
    averageTimeMs: 0,
    averageTimeToFirstClickMs: 0,
    averageClickCount: 0,
    averageMisclickCount: 0,
    averageBacktrackCount: 0,
    misclickRate: 0,
    successCI: { lowerBound: 0, upperBound: 0, level: 0.95 },
    directnessCI: { lowerBound: 0, upperBound: 0, level: 0.95 },
    timeBoxPlot: { min: 0, q1: 0, median: 0, q3: 0, max: 0, outliers: [] },
    statusBreakdown: {
      success: { direct: 0, indirect: 0, total: 0 },
      failure: { direct: 0, indirect: 0, total: 0 },
      skipped: { direct: 0, indirect: 0, total: 0 },
      abandoned: { direct: 0, indirect: 0, total: 0 },
    },
    taskScore: 0,
  }
}

export function computeParticipantSummaries(
  participants: Participant[],
  taskAttempts: PrototypeTestTaskAttempt[],
  totalTasks: number,
  flowResponseCounts: Map<string, number>
): ParticipantTaskSummary[] {
  const parsedAttempts = taskAttempts.map(parseTaskAttempt)
  const attemptsByParticipant = new Map<string, ParsedTaskAttempt[]>()

  for (const attempt of parsedAttempts) {
    const existing = attemptsByParticipant.get(attempt.participant_id) || []
    existing.push(attempt)
    attemptsByParticipant.set(attempt.participant_id, existing)
  }

  return participants.map((participant) => {
    const attempts = attemptsByParticipant.get(participant.id) || []

    const completedCount = attempts.filter(
      (a) => a.outcome === 'success' || a.outcome === 'failure'
    ).length
    const skippedCount = attempts.filter((a) => a.outcome === 'skipped').length
    const successfulCount = attempts.filter((a) => a.outcome === 'success').length

    const totalTimeMs = sum(
      attempts
        .filter((a) => a.total_time_ms !== null)
        .map((a) => a.total_time_ms as number)
    )

    const postTaskQuestionResponses = sum(
      attempts.map((a) => a.post_task_responses.length)
    )

    const flowQuestionResponses = flowResponseCounts.get(participant.id) || 0

    return {
      participantId: participant.id,
      totalTasks,
      completedCount,
      skippedCount,
      successfulCount,
      totalTimeMs,
      totalQuestionResponses: flowQuestionResponses + postTaskQuestionResponses,
      flowQuestionResponses,
      postTaskQuestionResponses,
    }
  })
}

function sum(numbers: number[]): number {
  return numbers.reduce((acc, n) => acc + n, 0)
}

export function computePrototypeStatusBreakdown(
  attempts: ParsedTaskAttempt[]
): PrototypeStatusBreakdown {
  const breakdown: PrototypeStatusBreakdown = {
    success: { direct: 0, indirect: 0, total: 0 },
    failure: { direct: 0, indirect: 0, total: 0 },
    skipped: { direct: 0, indirect: 0, total: 0 },
    abandoned: { direct: 0, indirect: 0, total: 0 },
  }

  for (const attempt of attempts) {
    const category = breakdown[attempt.outcome]
    if (category) {
      category.total++
      if (attempt.is_direct) {
        category.direct++
      } else {
        category.indirect++
      }
    }
  }

  return breakdown
}
