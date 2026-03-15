'use client'

import { useCallback } from 'react'
import {
  useCardSortBuilderStore,
  useTreeTestBuilderStore,
  usePrototypeTestBuilderStore,
  useFirstClickBuilderStore,
  useFirstImpressionBuilderStore,
  useLiveWebsiteBuilderStore,
} from '@/stores/study-builder'
import { useStudyFlowBuilderStore } from '@/stores/study-flow-builder'
import { useSurveySections, useABTests } from '@/hooks'
import { validateStudy, type ValidationResult, type StudyValidationInput } from '@/lib/validation'

interface UseStudyValidationOptions {
  studyId: string | null
  studyType: 'card_sort' | 'tree_test' | 'survey' | 'prototype_test' | 'first_click' | 'first_impression' | 'live_website_test'
}

/**
 * Hook to validate a study
 * Gathers all data from stores/SWR hooks and runs validation
 */
export function useStudyValidation({ studyId, studyType }: UseStudyValidationOptions) {
  // Get flow data
  const flowSettings = useStudyFlowBuilderStore((state) => state.flowSettings)
  const screeningQuestions = useStudyFlowBuilderStore((state) => state.screeningQuestions)
  const preStudyQuestions = useStudyFlowBuilderStore((state) => state.preStudyQuestions)
  const postStudyQuestions = useStudyFlowBuilderStore((state) => state.postStudyQuestions)
  const surveyQuestions = useStudyFlowBuilderStore((state) => state.surveyQuestions)

  // Get card sort data
  const cards = useCardSortBuilderStore((state) => state.cards)
  const categories = useCardSortBuilderStore((state) => state.categories)
  const cardSortSettings = useCardSortBuilderStore((state) => state.settings)

  // Get tree test data
  const nodes = useTreeTestBuilderStore((state) => state.nodes)
  const tasks = useTreeTestBuilderStore((state) => state.tasks)

  // Get prototype test data
  const prototype = usePrototypeTestBuilderStore((state) => state.prototype)
  const prototypeTasks = usePrototypeTestBuilderStore((state) => state.tasks)

  // Get first-click test data
  const firstClickTasks = useFirstClickBuilderStore((state) => state.tasks)

  // Get first impression test data
  const firstImpressionDesigns = useFirstImpressionBuilderStore((state) => state.designs)

  // Get live website test data
  const liveWebsiteTasks = useLiveWebsiteBuilderStore((state) => state.tasks)
  const liveWebsiteSettings = useLiveWebsiteBuilderStore((state) => state.settings)

  // Get survey sections data (from SWR hook)
  const { sections: customSections } = useSurveySections(studyType === 'survey' ? studyId : null)

  // Get AB tests data (from SWR hook) - use abTestsMap for validation
  const { abTestsMap } = useABTests(studyType === 'survey' ? studyId : null)

  const validate = useCallback((): ValidationResult => {
    const input: StudyValidationInput = {
      studyType,
      flowSettings,
      screeningQuestions,
      preStudyQuestions,
      postStudyQuestions,
      surveyQuestions: studyType === 'survey' ? surveyQuestions : undefined,
      customSections: studyType === 'survey' ? customSections : undefined,
      abTests: studyType === 'survey' ? abTestsMap : undefined, // Pass AB tests map for validation
      cards: studyType === 'card_sort' ? cards : undefined,
      categories: studyType === 'card_sort' ? categories : undefined,
      cardSortSettings: studyType === 'card_sort' ? cardSortSettings as any : undefined,
      nodes: studyType === 'tree_test' ? nodes : undefined,
      tasks: studyType === 'tree_test' ? tasks : undefined,
      prototype: studyType === 'prototype_test' ? prototype : undefined,
      prototypeTasks: studyType === 'prototype_test' ? prototypeTasks : undefined,
      firstClickTasks: studyType === 'first_click' ? firstClickTasks : undefined,
      firstImpressionDesigns: studyType === 'first_impression' ? firstImpressionDesigns : undefined,
      liveWebsiteTasks: studyType === 'live_website_test' ? liveWebsiteTasks : undefined,
      liveWebsiteSettings: studyType === 'live_website_test' ? liveWebsiteSettings : undefined,
    }

    return validateStudy(input)
  }, [
    studyType,
    flowSettings,
    screeningQuestions,
    preStudyQuestions,
    postStudyQuestions,
    surveyQuestions,
    customSections,
    abTestsMap,
    cards,
    categories,
    cardSortSettings,
    nodes,
    tasks,
    prototype,
    prototypeTasks,
    firstClickTasks,
    firstImpressionDesigns,
    liveWebsiteTasks,
    liveWebsiteSettings,
  ])

  return { validate }
}
