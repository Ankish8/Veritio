'use client'

import { useCallback, useRef } from 'react'
import { useStudyFlowBuilderStore, type ActiveFlowSection } from '@veritio/prototype-test/stores'
import type { FlowSection } from '@veritio/prototype-test/lib/supabase/study-flow-types'
import { useFlowState } from './use-flow-state'
import { useFlowHelpers } from './use-flow-helpers'

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

  // Pulled out of `state`/`helpers` so the callbacks below depend on the
  // individual members. Both hooks return a fresh object each render, so
  // depending on the objects themselves would rebuild every callback on every
  // render and defeat the memoisation.
  const {
    setActiveFlowSection,
    setSelectedQuestionId,
    addQuestion,
    flowSettings,
    updatePreStudySettings,
    updatePostStudySettings,
    customSections,
    createSection,
  } = state
  const { getQuestionsForSection } = helpers

  // Handle question selection
  const handleSelectQuestion = useCallback((sectionId: ActiveFlowSection, questionId: string) => {
    setActiveFlowSection(sectionId)
    setSelectedQuestionId(questionId)
  }, [setActiveFlowSection, setSelectedQuestionId])

  // Handle adding a question with auto-intro setup
  const handleAddQuestion = useCallback((sectionId: ActiveFlowSection) => {
    const flowSection = sectionId as FlowSection
    const newQuestionId = addQuestion(flowSection, 'multiple_choice')

    const currentQuestions = getQuestionsForSection(sectionId)
    if (currentQuestions.length === 0) {
      if (flowSection === 'pre_study' && !flowSettings.preStudyQuestions.introTitle) {
        updatePreStudySettings({
          introTitle: 'Before We Begin',
          introMessage: 'Please answer the following questions.',
        })
      } else if (flowSection === 'post_study' && !flowSettings.postStudyQuestions.introTitle) {
        updatePostStudySettings({
          introTitle: 'Almost Done',
          introMessage: 'Please answer a few final questions about your experience.',
        })
      }
    }

    setActiveFlowSection(sectionId)
    setSelectedQuestionId(newQuestionId)
    return newQuestionId
  }, [addQuestion, getQuestionsForSection, flowSettings, updatePreStudySettings, updatePostStudySettings, setActiveFlowSection, setSelectedQuestionId])

  // Track pending section names to prevent duplicates on rapid clicks
  // (React state is async, so we need synchronous tracking)
  const pendingSectionNamesRef = useRef<Set<string>>(new Set())

  // Handle adding a custom section (survey only)
  // Creates a new section with a new question, focuses on it
  const handleAddCustomSection = useCallback(async () => {
    // Combine existing names from state AND pending names from rapid clicks
    const existingNames = new Set([
      ...customSections.map(s => s.name),
      ...pendingSectionNamesRef.current,
    ])

    // Get unique section name
    let sectionNumber = customSections.length + pendingSectionNamesRef.current.size + 1
    let sectionName = `Section ${sectionNumber}`
    while (existingNames.has(sectionName)) {
      sectionNumber++
      sectionName = `Section ${sectionNumber}`
    }

    // Mark as pending (synchronous - prevents duplicates)
    pendingSectionNamesRef.current.add(sectionName)

    try {
      const newSection = await createSection({ name: sectionName, parent_section: 'survey' })

      if (newSection) {
        // Add a new question to the section and focus on it
        const newQuestionId = addQuestion('survey', 'multiple_choice', newSection.id)
        setActiveFlowSection('survey')
        setSelectedQuestionId(newQuestionId)
      }
    } finally {
      // Remove from pending after completion
      pendingSectionNamesRef.current.delete(sectionName)
    }
  }, [customSections, createSection, addQuestion, setActiveFlowSection, setSelectedQuestionId])

  return {
    ...state,
    ...helpers,
    handleSelectQuestion,
    handleAddQuestion,
    handleAddCustomSection,
  }
}

export type FlowBuilderState = ReturnType<typeof useFlowBuilder>
