import type {
  PrototypeTestTask,
  PrototypeTestTaskAttempt,
  StudyFlowQuestionRow,
  StudyFlowResponseRow,
} from '@veritio/study-types'

export interface ParticipantMetrics {
  tasksSuccessful: number
  tasksSkipped: number
  tasksCompleted: number
  totalTimeMs: number
  totalClicks: number
  avgClicks: number
  totalMisclicks: number
  totalBacktracks: number
  directPathCount: number
  avgTimeToFirstClick: number | null
  questionsAnswered: number
  totalQuestions: number
}

export function calculateParticipantMetrics(
  attempts: PrototypeTestTaskAttempt[],
  flowResponses: StudyFlowResponseRow[],
  flowQuestions: StudyFlowQuestionRow[],
  tasks: PrototypeTestTask[]
): ParticipantMetrics {
  const tasksSuccessful = attempts.filter(a => a.outcome === 'success').length
  const tasksSkipped = attempts.filter(a => a.outcome === 'skipped').length
  const tasksCompleted = attempts.filter(
    a => a.outcome === 'success' || a.outcome === 'failure'
  ).length

  const totalTimeMs = attempts.reduce((sum, a) => sum + (a.total_time_ms || 0), 0)
  const totalClicks = attempts.reduce((sum, a) => sum + (a.click_count || 0), 0)
  const avgClicks = attempts.length > 0 ? totalClicks / attempts.length : 0
  const totalMisclicks = attempts.reduce((sum, a) => sum + (a.misclick_count || 0), 0)
  const totalBacktracks = attempts.reduce((sum, a) => sum + (a.backtrack_count || 0), 0)
  const directPathCount = attempts.filter(a => a.is_direct === true).length

  const avgTimeToFirstClick = attempts.length > 0
    ? attempts.reduce((sum, a) => sum + (a.time_to_first_click_ms || 0), 0) / attempts.length
    : null

  const flowResponseCount = flowResponses.length
  const postTaskResponseCount = attempts.reduce((sum, a) => {
    const responses = a.post_task_responses as unknown[] | null
    return sum + (Array.isArray(responses) ? responses.length : 0)
  }, 0)

  const totalFlowQuestions = flowQuestions.length
  const totalPostTaskQuestions = tasks.reduce((sum, t) => {
    const questions = t.post_task_questions as unknown[] | null
    return sum + (Array.isArray(questions) ? questions.length : 0)
  }, 0)

  return {
    tasksSuccessful,
    tasksSkipped,
    tasksCompleted,
    totalTimeMs,
    totalClicks,
    avgClicks,
    totalMisclicks,
    totalBacktracks,
    directPathCount,
    avgTimeToFirstClick,
    questionsAnswered: flowResponseCount + postTaskResponseCount,
    totalQuestions: totalFlowQuestions + totalPostTaskQuestions,
  }
}
