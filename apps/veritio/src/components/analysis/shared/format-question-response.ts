/**
 * Shared utilities for rendering post-task and flow question responses
 * using the rich QuestionResponseCard component.
 *
 * Adapts PostTaskQuestion / generic question shapes into the
 * StudyFlowQuestionRow / StudyFlowResponseRow interfaces expected
 * by QuestionResponseCard.
 */
import type { StudyFlowQuestionRow, StudyFlowResponseRow } from '@veritio/study-types'

interface PostTaskQuestionLike {
  id: string
  question_text?: string
  text?: string
  question_type?: string
  config?: unknown
}

/**
 * Convert a post-task question (from task's post_task_questions JSON)
 * into the StudyFlowQuestionRow shape expected by QuestionResponseCard.
 */
export function toFlowQuestion(q: PostTaskQuestionLike): StudyFlowQuestionRow {
  return {
    id: q.id,
    question_text: q.question_text || q.text || '',
    question_type: q.question_type || 'single_line_text',
    config: (q.config ?? null) as StudyFlowQuestionRow['config'],
    position: 0,
    section: 'post_task',
    study_id: '',
    branching_logic: null,
    created_at: null,
    custom_section_id: null,
    description: null,
    display_logic: null,
    is_required: null,
    question_text_html: null,
    updated_at: null,
  }
}

/**
 * Convert a post-task response value into the StudyFlowResponseRow shape
 * expected by QuestionResponseCard.
 */
export function toFlowResponse(questionId: string, value: unknown): StudyFlowResponseRow {
  return {
    id: questionId,
    question_id: questionId,
    response_value: value as StudyFlowResponseRow['response_value'],
    participant_id: '',
    study_id: '',
    created_at: null,
    response_time_ms: null,
  }
}
