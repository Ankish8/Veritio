import type { FlowSection, QuestionType, StudyFlowQuestion } from '@veritio/prototype-test/lib/supabase/study-flow-types'
import { getDefaultQuestionConfig } from '@veritio/prototype-test/lib/supabase/study-flow-types'
import type { StudyFlowBuilderState } from './types'
import { getQuestionsBySection, setQuestionsBySection } from './helpers'
// QUESTION ACTIONS
export function createAddQuestion(
  set: (updates: Partial<StudyFlowBuilderState>) => void,
  get: () => StudyFlowBuilderState
) {
  return (section: FlowSection, questionType: QuestionType, customSectionId?: string): string => {
    const state = get()
    const questions = getQuestionsBySection(state, section)
    const newId = crypto.randomUUID()

    const newQuestion: StudyFlowQuestion = {
      id: newId,
      study_id: state.studyId || '',
      section,
      position: questions.length,
      question_type: questionType,
      question_text: '',
      question_text_html: null,
      description: null,
      is_required: true,
      config: getDefaultQuestionConfig(questionType),
      display_logic: null,
      branching_logic: null,
      custom_section_id: customSectionId || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    set({
      ...setQuestionsBySection(section, [...questions, newQuestion]),
      selectedQuestionId: newId,
      expandedQuestionId: newId,
    })

    return newId
  }
}
export function createUpdateQuestion(
  set: (fn: (state: StudyFlowBuilderState) => Partial<StudyFlowBuilderState>) => void
) {
  return (questionId: string, updates: Partial<StudyFlowQuestion>): void => {
    set((state) => {
      const updateInSection = (questions: StudyFlowQuestion[]) =>
        questions.map((q) =>
          q.id === questionId
            ? { ...q, ...updates, updated_at: new Date().toISOString() }
            : q
        )

      return {
        screeningQuestions: updateInSection(state.screeningQuestions),
        preStudyQuestions: updateInSection(state.preStudyQuestions),
        postStudyQuestions: updateInSection(state.postStudyQuestions),
        surveyQuestions: updateInSection(state.surveyQuestions),
      }
    })
  }
}
export function createRemoveQuestion(
  set: (fn: (state: StudyFlowBuilderState) => Partial<StudyFlowBuilderState>) => void,
  get: () => StudyFlowBuilderState
) {
  return (section: FlowSection, questionId: string): void => {
    set((state) => {
      const questions = getQuestionsBySection(state, section)
      const filtered = questions
        .filter((q) => q.id !== questionId)
        .map((q, i) => ({ ...q, position: i }))

      return {
        ...setQuestionsBySection(section, filtered),
        selectedQuestionId:
          state.selectedQuestionId === questionId ? null : state.selectedQuestionId,
        expandedQuestionId:
          state.expandedQuestionId === questionId ? null : state.expandedQuestionId,
      }
    })
  }
}
export function createReorderQuestions(
  set: (updates: Partial<StudyFlowBuilderState>) => void
) {
  return (section: FlowSection, questions: StudyFlowQuestion[]): void => {
    set({
      ...setQuestionsBySection(
        section,
        questions.map((q, i) => ({ ...q, position: i }))
      ),
    })
  }
}
export function createDuplicateQuestion(
  set: (updates: Partial<StudyFlowBuilderState>) => void,
  get: () => StudyFlowBuilderState
) {
  return (section: FlowSection, questionId: string): string | null => {
    const state = get()
    const questions = getQuestionsBySection(state, section)
    const originalQuestion = questions.find((q) => q.id === questionId)

    if (!originalQuestion) return null

    const newId = crypto.randomUUID()
    const duplicatedQuestion: StudyFlowQuestion = {
      ...originalQuestion,
      id: newId,
      question_text: `${originalQuestion.question_text} (copy)`,
      position: questions.length,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    set({
      ...setQuestionsBySection(section, [...questions, duplicatedQuestion]),
      selectedQuestionId: newId,
      expandedQuestionId: newId,
    })

    return newId
  }
}
