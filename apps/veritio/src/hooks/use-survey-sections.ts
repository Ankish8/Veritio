'use client'

import { useCallback } from 'react'
import { SWR_KEYS } from '@/lib/swr'
import {
  createCRUDHook,
  createScopedArrayCRUDConfig,
  buildOptimisticReorder,
} from '@/lib/swr/crud-factory'
import type {
  SurveyCustomSection,
  SurveyCustomSectionInsert,
  SurveyCustomSectionUpdate,
} from '@veritio/study-types/study-flow-types'

const surveySectionsConfig = createScopedArrayCRUDConfig<SurveyCustomSection>({
  name: 'survey section',
  scopeParam: 'studyId',
  keyBuilder: (studyId) => SWR_KEYS.surveySections(studyId),
  apiUrlBuilder: (studyId) => `/api/studies/${studyId}/sections`,
  defaultItem: {
    parent_section: 'survey',
    is_visible: true,
    description: null,
  },
  createPosition: 'append',
  indexes: [{ name: 'byId', keyExtractor: (s) => s.id }],
})

surveySectionsConfig.bulkOperations = {
  reorder: {
    type: 'reorder',
    url: (baseUrl) => `${baseUrl}/reorder`,
    method: 'POST',
    buildOptimisticData: (currentData, orderedIds) =>
      buildOptimisticReorder(currentData, orderedIds),
  },
}

if (surveySectionsConfig.operations?.update) {
  surveySectionsConfig.operations.update.method = 'PUT'
}

const useSurveySectionsInternal = createCRUDHook(surveySectionsConfig)

/** Fetches and manages survey custom sections with SWR caching and optimistic updates. */
export function useSurveySections(studyId: string | null) {
  const result = useSurveySectionsInternal(
    { studyId: studyId || '' },
    { skip: !studyId }
  )

  const sections = result.data

  const createSection = useCallback(
    async (input: Omit<SurveyCustomSectionInsert, 'study_id'>): Promise<SurveyCustomSection | null> => {
      if (!studyId) return null
      return result.create?.(input) ?? null
    },
    [studyId, result]
  )

  const updateSection = useCallback(
    async (sectionId: string, updates: SurveyCustomSectionUpdate): Promise<SurveyCustomSection | null> => {
      if (!studyId) return null
      return result.update?.(sectionId, updates) ?? null
    },
    [studyId, result]
  )

  const deleteSection = useCallback(
    async (sectionId: string): Promise<boolean> => {
      if (!studyId) return false
      return result.delete?.(sectionId) ?? false
    },
    [studyId, result]
  )

  const deleteAllSections = useCallback(
    async (): Promise<boolean> => {
      if (!studyId || sections.length === 0) return true
      for (const section of sections) {
        await result.delete?.(section.id)
      }

      await result.refetch?.()
      return true
    },
    [studyId, sections, result]
  )

  const reorderSections = useCallback(
    async (orderedSectionIds: string[]): Promise<boolean> => {
      if (!studyId) return false
      return result.reorder?.(orderedSectionIds) ?? false
    },
    [studyId, result]
  )

  const getSectionById = useCallback(
    (sectionId: string) => sections.find((s) => s.id === sectionId),
    [sections]
  )

  const getSectionsByParent = useCallback(
    (parentSection: 'survey' | 'pre_study' | 'post_study') =>
      sections
        .filter((s) => s.parent_section === parentSection)
        .sort((a, b) => a.position - b.position),
    [sections]
  )

  const getVisibleSections = useCallback(
    () =>
      sections
        .filter((s) => s.is_visible)
        .sort((a, b) => a.position - b.position),
    [sections]
  )

  return {
    sections,
    isLoading: result.isLoading,
    error: result.error,
    refetch: result.refetch,

    createSection,
    updateSection,
    deleteSection,
    deleteAllSections,
    reorderSections,

    getSectionById,
    getSectionsByParent,
    getVisibleSections,
  }
}
