import type { PrototypeTestTask } from '@veritio/study-types'
import type { TaskResult, TaskQuestionResponses, ResponsePreventionData } from './types'

interface SubmitResultsParams {
  results: TaskResult[]
  questionResponses: TaskQuestionResponses[]
  tasks: PrototypeTestTask[]
  taskAttemptIds: Record<string, string>
  shareCode: string
  sessionToken: string
  clickEvents: any[]
  navigationEvents: any[]
  componentStateEvents: any[]
  demographicData: any
  preventionData?: ResponsePreventionData
}

export async function submitPrototypeTestResults({
  results,
  questionResponses,
  tasks,
  taskAttemptIds,
  shareCode,
  sessionToken,
  clickEvents,
  navigationEvents,
  componentStateEvents,
  demographicData,
  preventionData,
}: SubmitResultsParams): Promise<void> {
  const taskAttemptsWithResponses = results.map((r) => {
    const taskQuestionResponse = questionResponses.find(qr => qr.taskId === r.taskId)
    const task = tasks.find(t => t.id === r.taskId)
    return {
      taskId: r.taskId,
      taskAttemptId: taskAttemptIds[r.taskId] || null,
      outcome: r.outcome,
      pathTaken: r.pathTaken,
      isDirect: r.followedCorrectPath,
      totalTimeMs: r.totalTimeMs,
      timeToFirstClickMs: r.timeToFirstClickMs,
      clickCount: r.clickCount,
      misclickCount: r.misclickCount,
      backtrackCount: r.backtrackCount,
      postTaskResponses: taskQuestionResponse?.responses || null,
      successPathway: task?.success_pathway ?? null,
    }
  })

  const clickEventsForSubmit = clickEvents.map(e => ({
    ...e,
    timestamp: new Date(e.timestamp).toISOString(),
  }))
  const navEventsForSubmit = navigationEvents.map(e => ({
    ...e,
    timestamp: new Date(e.timestamp).toISOString(),
  }))
  const componentStateEventsForSubmit = componentStateEvents.map(e => ({
    ...e,
    timestamp: new Date(e.timestamp).toISOString(),
  }))

  const response = await fetch(
    `/api/participate/${shareCode}/submit/prototype-test`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionToken,
        taskAttempts: taskAttemptsWithResponses,
        clickEvents: clickEventsForSubmit,
        navigationEvents: navEventsForSubmit,
        componentStateEvents: componentStateEventsForSubmit,
        demographicData: demographicData ?? null,
        cookieId: preventionData?.cookieId ?? null,
        fingerprintHash: preventionData?.fingerprintHash ?? null,
        fingerprintConfidence: preventionData?.fingerprintConfidence ?? null,
      }),
    }
  )

  if (!response.ok) {
    const data = await response.json()
    throw new Error(data.error || 'Failed to submit responses')
  }
}
