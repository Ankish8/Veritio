'use client'

import { useEffect, useRef } from 'react'
import { useStudyFlowBuilderStore } from '@veritio/prototype-test/stores'
import { useSurveySections } from '../../../../hooks'
import { useSurveySectionsUIStore } from '@/stores/survey-sections-ui-store'
import { useYjsOptional } from '../../../yjs'
import { useYjsFlowSync } from '@veritio/prototype-test/hooks'

interface UseFlowStateProps {
  studyId: string
  studyType: 'card_sort' | 'tree_test' | 'survey' | 'prototype_test' | 'first_click' | 'first_impression' | 'live_website_test'
}
export function useFlowState({ studyId, studyType }: UseFlowStateProps) {
  const mainStore = useStudyFlowBuilderStore()

  // Yjs real-time collaboration sync
  const yjsContext = useYjsOptional()
  useYjsFlowSync({
    doc: yjsContext?.doc ?? null,
    isSynced: yjsContext?.isSynced ?? false,
    enabled: !!yjsContext?.doc, // Only enable when Yjs is available
  })

  // Survey sections: data from SWR, UI state from Zustand
  const isSurvey = studyType === 'survey'
  const {
    sections: customSections,
    createSection,
    updateSection,
    deleteSection,
    reorderSections,
  } = useSurveySections(isSurvey ? studyId : null)
  const { selectedSectionId, setSelectedSectionId } = useSurveySectionsUIStore()

  const hasHydrated = useRef(false)

  // Hydrate the store on mount
  useEffect(() => {
    if (!hasHydrated.current) {
      hasHydrated.current = true
      useStudyFlowBuilderStore.persist.rehydrate()
      mainStore.setHydrated(true)
    }
  }, [mainStore.setHydrated])

  return {
    // Main store state
    flowSettings: mainStore.flowSettings,
    screeningQuestions: mainStore.screeningQuestions,
    preStudyQuestions: mainStore.preStudyQuestions,
    postStudyQuestions: mainStore.postStudyQuestions,
    surveyQuestions: mainStore.surveyQuestions,
    activeFlowSection: mainStore.activeFlowSection,
    selectedQuestionId: mainStore.selectedQuestionId,
    selectedDemographicSectionId: mainStore.selectedDemographicSectionId,
    isHydrated: mainStore.isHydrated,

    // Main store actions
    setActiveFlowSection: mainStore.setActiveFlowSection,
    setSelectedQuestionId: mainStore.setSelectedQuestionId,
    setSelectedDemographicSectionId: mainStore.setSelectedDemographicSectionId,
    updateIdentifierSettings: mainStore.updateIdentifierSettings,
    updatePreStudySettings: mainStore.updatePreStudySettings,
    updatePostStudySettings: mainStore.updatePostStudySettings,
    updateSurveyQuestionnaireSettings: mainStore.updateSurveyQuestionnaireSettings,
    updateQuestion: mainStore.updateQuestion,
    addQuestion: mainStore.addQuestion,
    removeQuestion: mainStore.removeQuestion,
    duplicateQuestion: mainStore.duplicateQuestion,
    reorderQuestions: mainStore.reorderQuestions,
    removeDemographicSection: mainStore.removeDemographicSection,

    // Survey sections (data from SWR, UI from Zustand)
    customSections: customSections,
    selectedSectionId,
    setSelectedSectionId,
    createSection,
    updateSection,
    deleteSection,
    reorderSections,
  }
}

export type FlowState = ReturnType<typeof useFlowState>
