'use client'

import { useCallback, useRef } from 'react'
import { useStudyFlowBuilderStore, type ActiveFlowSection } from '@veritio/prototype-test/stores'
import type { FlowSection } from '@veritio/prototype-test/lib/supabase/study-flow-types'
import { useFlowState, type FlowState } from './use-flow-state'
import { useFlowHelpers, type FlowHelpers } from './use-flow-helpers'

interface UseFlowBuilderProps {
  studyId: string
  studyType: 'card_sort' | 'tree_test' | 'survey' | 'prototype_test' | 'first_click' | 'first_impression' | 'live_website_test'
}
export function useFlowBuilder({ studyId, studyType }: UseFlowBuilderProps) {
  const state = useFlowState({ studyId, studyType })

  // Get toggle actions from store (not in state hook to avoid circular deps)
  const { updateWelcomeSettings, updateAgreementSettings, updateScreeningSettings, updateInstructionsSettings } =
    useStudyFlowBuilderStore()

  const helpers = useFlowHelpers({
    flowSettings: state.flowSettings,
    screeningQuestions: state.screeningQuestions,
    preStudyQuestions: state.preStudyQuestions,
    postStudyQuestions: state.postStudyQuestions,
    surveyQuestions: state.surveyQuestions,
    activeFlowSection: state.activeFlowSection,
    selectedQuestionId: state.selectedQuestionId,
    updateWelcomeSettings,
    updateAgreementSettings,
    updateScreeningSettings,
    updatePreStudySettings: state.updatePreStudySettings,
    updatePostStudySettings: state.updatePostStudySettings,
    updateInstructionsSettings,
    setActiveFlowSection: state.setActiveFlowSection,
    addQuestion: state.addQuestion,
    setSelectedQuestionId: state.setSelectedQuestionId,
  })

  // Handle question selection
  const handleSelectQuestion = useCallback((sectionId: ActiveFlowSection, questionId: string) => {
    state.setActiveFlowSection(sectionId)
    state.setSelectedQuestionId(questionId)
  }, [state.setActiveFlowSection, state.setSelectedQuestionId])

  // Handle adding a question with auto-intro setup
  const handleAddQuestion = useCallback((sectionId: ActiveFlowSection) => {
    const flowSection = sectionId as FlowSection
    const newQuestionId = state.addQuestion(flowSection, 'multiple_choice')

    const currentQuestions = helpers.getQuestionsForSection(sectionId)
    if (currentQuestions.length === 0) {
      if (flowSection === 'pre_study' && !state.flowSettings.preStudyQuestions.introTitle) {
        state.updatePreStudySettings({
          introTitle: 'Before We Begin',
          introMessage: 'Please answer the following questions.',
        })
      } else if (flowSection === 'post_study' && !state.flowSettings.postStudyQuestions.introTitle) {
        state.updatePostStudySettings({
          introTitle: 'Almost Done',
          introMessage: 'Please answer a few final questions about your experience.',
        })
      }
    }

    state.setActiveFlowSection(sectionId)
    state.setSelectedQuestionId(newQuestionId)
    return newQuestionId
  }, [state, helpers.getQuestionsForSection])

  // Track pending section names to prevent duplicates on rapid clicks
  // (React state is async, so we need synchronous tracking)
  const pendingSectionNamesRef = useRef<Set<string>>(new Set())

  // Handle adding a custom section (survey only)
  // Creates a new section with a new question, focuses on it
  const handleAddCustomSection = useCallback(async () => {
    // Combine existing names from state AND pending names from rapid clicks
    const existingNames = new Set([
      ...state.customSections.map(s => s.name),
      ...pendingSectionNamesRef.current,
    ])

    // Get unique section name
    let sectionNumber = state.customSections.length + pendingSectionNamesRef.current.size + 1
    let sectionName = `Section ${sectionNumber}`
    while (existingNames.has(sectionName)) {
      sectionNumber++
      sectionName = `Section ${sectionNumber}`
    }

    // Mark as pending (synchronous - prevents duplicates)
    pendingSectionNamesRef.current.add(sectionName)

    try {
      const newSection = await state.createSection({ name: sectionName, parent_section: 'survey' })

      if (newSection) {
        // Add a new question to the section and focus on it
        const newQuestionId = state.addQuestion('survey', 'multiple_choice', newSection.id)
        state.setActiveFlowSection('survey')
        state.setSelectedQuestionId(newQuestionId)
      }
    } finally {
      // Remove from pending after completion
      pendingSectionNamesRef.current.delete(sectionName)
    }
  }, [state.customSections, state.createSection, state.addQuestion, state.setActiveFlowSection, state.setSelectedQuestionId])

  return {
    ...state,
    ...helpers,
    handleSelectQuestion,
    handleAddQuestion,
    handleAddCustomSection,
  }
}

export type FlowBuilderState = ReturnType<typeof useFlowBuilder>
