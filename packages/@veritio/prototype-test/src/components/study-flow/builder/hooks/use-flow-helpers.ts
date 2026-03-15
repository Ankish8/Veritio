'use client'

import { useMemo, useCallback } from 'react'
import type { ActiveFlowSection } from '@veritio/prototype-test/stores'
import type { FlowSection, StudyFlowQuestion, StudyFlowSettings, QuestionType } from '@veritio/prototype-test/lib/supabase/study-flow-types'

type FlowSettings = StudyFlowSettings

// Find first incomplete question (empty question_text)
const getFirstIncompleteQuestion = (questions: StudyFlowQuestion[]) =>
  questions.find((q) => !q.question_text || q.question_text.trim() === '') || null

// Map settings key to ActiveFlowSection type
const SECTION_MAP: Record<string, ActiveFlowSection> = {
  'welcome': 'welcome',
  'participantAgreement': 'agreement',
  'screening': 'screening',
  'preStudyQuestions': 'pre_study',
  'postStudyQuestions': 'post_study',
  'activityInstructions': 'instructions',
}

// Handle question section toggle logic
const handleQuestionToggle = (
  questions: StudyFlowQuestion[],
  isEnabling: boolean,
  addQuestion: (section: FlowSection, type: QuestionType, customSectionId?: string) => string,
  setSelectedQuestionId: (id: string | null) => void,
  flowSection: FlowSection
) => {
  if (isEnabling) {
    if (questions.length === 0) {
      setSelectedQuestionId(addQuestion(flowSection, 'multiple_choice'))
    } else {
      const incomplete = getFirstIncompleteQuestion(questions)
      if (incomplete) setSelectedQuestionId(incomplete.id)
    }
  }
}

interface UseFlowHelpersProps {
  flowSettings: FlowSettings
  screeningQuestions: StudyFlowQuestion[]
  preStudyQuestions: StudyFlowQuestion[]
  postStudyQuestions: StudyFlowQuestion[]
  surveyQuestions: StudyFlowQuestion[]
  activeFlowSection: ActiveFlowSection
  selectedQuestionId: string | null
  updateWelcomeSettings: (settings: Partial<FlowSettings['welcome']>) => void
  updateAgreementSettings: (settings: Partial<FlowSettings['participantAgreement']>) => void
  updateScreeningSettings: (settings: Partial<FlowSettings['screening']>) => void
  updatePreStudySettings: (settings: Partial<FlowSettings['preStudyQuestions']>) => void
  updatePostStudySettings: (settings: Partial<FlowSettings['postStudyQuestions']>) => void
  updateInstructionsSettings: (settings: Partial<FlowSettings['activityInstructions']>) => void
  setActiveFlowSection: (section: ActiveFlowSection) => void
  addQuestion: (section: FlowSection, questionType: QuestionType, customSectionId?: string) => string
  setSelectedQuestionId: (id: string | null) => void
}
export function useFlowHelpers({
  flowSettings,
  screeningQuestions,
  preStudyQuestions,
  postStudyQuestions,
  surveyQuestions,
  activeFlowSection,
  selectedQuestionId,
  updateWelcomeSettings,
  updateAgreementSettings,
  updateScreeningSettings,
  updatePreStudySettings,
  updatePostStudySettings,
  updateInstructionsSettings,
  setActiveFlowSection,
  addQuestion,
  setSelectedQuestionId,
}: UseFlowHelpersProps) {
  // Check if a section is enabled
  const getSectionEnabled = useCallback((key?: string): boolean => {
    if (!key) return true
    const settings = flowSettings[key as keyof typeof flowSettings]
    return settings && typeof settings === 'object' && 'enabled' in settings
      ? (settings as { enabled: boolean }).enabled
      : true
  }, [flowSettings])

  // Toggle section enabled state
  const toggleSectionEnabled = useCallback(
    (key: string) => {
      const current = getSectionEnabled(key)
      const isEnabling = !current

      if (isEnabling) {
        setActiveFlowSection(SECTION_MAP[key] || 'welcome')
      }

      switch (key) {
        case 'welcome':
          updateWelcomeSettings({ enabled: !current })
          break
        case 'participantAgreement':
          updateAgreementSettings({ enabled: !current })
          break
        case 'screening':
          updateScreeningSettings({ enabled: !current })
          handleQuestionToggle(screeningQuestions, isEnabling, addQuestion, setSelectedQuestionId, 'screening')
          break
        case 'preStudyQuestions':
          updatePreStudySettings({ enabled: !current })
          handleQuestionToggle(preStudyQuestions, isEnabling, addQuestion, setSelectedQuestionId, 'pre_study')
          break
        case 'postStudyQuestions':
          updatePostStudySettings({ enabled: !current })
          handleQuestionToggle(postStudyQuestions, isEnabling, addQuestion, setSelectedQuestionId, 'post_study')
          break
        case 'activityInstructions':
          updateInstructionsSettings({ enabled: !current })
          break
      }
    },
    [
      getSectionEnabled,
      updateWelcomeSettings,
      updateAgreementSettings,
      updateScreeningSettings,
      updatePreStudySettings,
      updatePostStudySettings,
      updateInstructionsSettings,
      setActiveFlowSection,
      addQuestion,
      setSelectedQuestionId,
      screeningQuestions,
      preStudyQuestions,
      postStudyQuestions,
    ]
  )
  // Get questions for a section
  const getQuestionsForSection = useCallback((sectionId: ActiveFlowSection): StudyFlowQuestion[] => {
    switch (sectionId) {
      case 'screening':
        return screeningQuestions
      case 'pre_study':
        return preStudyQuestions
      case 'post_study':
        return postStudyQuestions
      case 'survey':
        return surveyQuestions
      default:
        return []
    }
  }, [screeningQuestions, preStudyQuestions, postStudyQuestions, surveyQuestions])
  // Get the currently selected question
  const selectedQuestion = useMemo(() => {
    if (!selectedQuestionId || selectedQuestionId === 'intro' || selectedQuestionId === 'rejection') {
      return null
    }
    const questions = getQuestionsForSection(activeFlowSection)
    return questions.find(q => q.id === selectedQuestionId) || null
  }, [selectedQuestionId, activeFlowSection, getQuestionsForSection])
  return {
    getSectionEnabled,
    toggleSectionEnabled,
    getQuestionsForSection,
    selectedQuestion,
  }
}

export type FlowHelpers = ReturnType<typeof useFlowHelpers>
