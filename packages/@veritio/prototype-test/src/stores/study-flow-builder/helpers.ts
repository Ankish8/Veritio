import type { FlowSection, StudyFlowQuestion } from '@veritio/prototype-test/lib/supabase/study-flow-types'
import type { StudyFlowBuilderState } from './types'
import { deepEqual } from '../../lib/utils/deep-equal'
// QUESTION SECTION HELPERS
export function getQuestionsBySection(
  state: StudyFlowBuilderState,
  section: FlowSection
): StudyFlowQuestion[] {
  switch (section) {
    case 'screening':
      return state.screeningQuestions
    case 'pre_study':
      return state.preStudyQuestions
    case 'post_study':
      return state.postStudyQuestions
    case 'survey':
      return state.surveyQuestions
    default: {
      const _exhaustive: never = section
      return _exhaustive
    }
  }
}
export function setQuestionsBySection(
  section: FlowSection,
  questions: StudyFlowQuestion[]
): Partial<StudyFlowBuilderState> {
  switch (section) {
    case 'screening':
      return { screeningQuestions: questions }
    case 'pre_study':
      return { preStudyQuestions: questions }
    case 'post_study':
      return { postStudyQuestions: questions }
    case 'survey':
      return { surveyQuestions: questions }
    default: {
      const _exhaustive: never = section
      return _exhaustive
    }
  }
}
// DIRTY STATE SELECTOR
export function selectFlowIsDirty(state: StudyFlowBuilderState): boolean {
  // If no snapshot exists, assume dirty (data hasn't been saved yet)
  if (!state._snapshot) return true

  return (
    !deepEqual(state.flowSettings, state._snapshot.flowSettings) ||
    !deepEqual(state.screeningQuestions, state._snapshot.screeningQuestions) ||
    !deepEqual(state.preStudyQuestions, state._snapshot.preStudyQuestions) ||
    !deepEqual(state.postStudyQuestions, state._snapshot.postStudyQuestions) ||
    !deepEqual(state.surveyQuestions, state._snapshot.surveyQuestions)
  )
}
