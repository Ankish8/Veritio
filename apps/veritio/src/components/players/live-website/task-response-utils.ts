import type { TaskResponse } from './types'

/**
 * Build a TaskResponse object with computed timestamps and duration.
 * Centralizes the duplicated construction found in several callbacks.
 */
export function buildTaskResponse(
  taskId: string,
  startTime: number,
  status: TaskResponse['status'],
  postTaskResponses?: Array<{ questionId: string; value: unknown }>
): TaskResponse {
  if (status === 'skipped') {
    return {
      taskId,
      status: 'skipped',
      startedAt: null,
      completedAt: null,
      durationMs: null,
    }
  }

  return {
    taskId,
    status,
    startedAt: startTime ? new Date(startTime).toISOString() : null,
    completedAt: new Date().toISOString(),
    durationMs: startTime ? Date.now() - startTime : null,
    postTaskResponses,
  }
}
