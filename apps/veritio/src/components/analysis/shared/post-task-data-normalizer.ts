import type { PostTaskQuestion } from '@veritio/study-types'
import type { StudyFlowQuestionRow, StudyFlowResponseRow } from '@veritio/study-types'

/**
 * Normalized post-task data interface.
 * All study types convert their task/response data into this format
 * so the PostTaskQuestionsSection can render them uniformly.
 */
export interface PostTaskData {
  tasks: PostTaskTaskInfo[]
  /** Synthesized StudyFlowQuestionRow[] for QuestionDisplay compatibility */
  questions: StudyFlowQuestionRow[]
  /** Synthesized StudyFlowResponseRow[] for QuestionDisplay compatibility */
  responses: StudyFlowResponseRow[]
}

export interface PostTaskTaskInfo {
  id: string
  title: string
  position: number
  questions: PostTaskQuestion[]
}

/**
 * Normalizes post-task data from any study type into the common format.
 *
 * @param tasks - Array of task objects. Each must have `id`, a title field, a position field, and `post_task_questions` (JSON).
 * @param postTaskResponses - Array of post-task response objects with `participant_id`, `task_id`, `question_id`, `value`.
 * @param studyId - Study ID used when synthesizing StudyFlowQuestionRow records.
 * @param options - Field name mappings for tasks that use different column names.
 */
 
export function normalizePostTaskData(
  tasks: Array<any>,
  postTaskResponses: Array<any>,
  studyId: string,
  options?: {
    titleField?: string
    positionField?: string
  }
): PostTaskData | null {
  const titleField = options?.titleField ?? 'title'
  const positionField = options?.positionField ?? 'order_position'

  // Parse post_task_questions from each task
  const taskInfos: PostTaskTaskInfo[] = []

  for (const task of tasks) {
    const rawQuestions = task.post_task_questions
    if (!rawQuestions) continue

    const questions = parsePostTaskQuestions(rawQuestions)
    if (questions.length === 0) continue

    taskInfos.push({
      id: task.id as string,
      title: (task[titleField] as string) || `Task ${(task[positionField] as number ?? 0) + 1}`,
      position: (task[positionField] as number) ?? 0,
      questions,
    })
  }

  if (taskInfos.length === 0) return null

  // Sort by position
  taskInfos.sort((a, b) => a.position - b.position)

  // Synthesize StudyFlowQuestionRow[] from PostTaskQuestion[]
  const synthesizedQuestions: StudyFlowQuestionRow[] = []

  for (const taskInfo of taskInfos) {
    for (const q of taskInfo.questions) {
      synthesizedQuestions.push({
        id: q.id,
        study_id: studyId,
        section: 'post_task',
        question_text: q.question_text || q.text || '',
        question_text_html: q.question_text_html || null,
        question_type: q.question_type || q.type || 'single_line_text',
        is_required: q.is_required ?? q.required ?? false,
        config: (q.config ?? null) as unknown as Record<string, unknown> | null,
        position: q.position ?? 0,
        created_at: null,
        // Attach task metadata for grouping
        _taskId: taskInfo.id,
        _taskTitle: taskInfo.title,
      } as StudyFlowQuestionRow & { _taskId: string; _taskTitle: string })
    }
  }

  // Synthesize StudyFlowResponseRow[] from post-task responses
  const synthesizedResponses: StudyFlowResponseRow[] = postTaskResponses.map((r) => ({
    id: (r.id as string) || `${r.participant_id}-${r.question_id}`,
    study_id: studyId,
    participant_id: r.participant_id as string,
    question_id: r.question_id as string,
    response_value: r.value as unknown,
    response_time_ms: null,
    created_at: (r.created_at as string) || null,
  } as StudyFlowResponseRow))

  return {
    tasks: taskInfos,
    questions: synthesizedQuestions,
    responses: synthesizedResponses,
  }
}

function parsePostTaskQuestions(raw: unknown): PostTaskQuestion[] {
  if (!raw) return []

  let questions: unknown[]
  if (typeof raw === 'string') {
    try {
      questions = JSON.parse(raw)
    } catch {
      return []
    }
  } else if (Array.isArray(raw)) {
    questions = raw
  } else {
    return []
  }

  return questions.filter(
    (q): q is PostTaskQuestion =>
      typeof q === 'object' && q !== null && 'id' in q
  )
}
