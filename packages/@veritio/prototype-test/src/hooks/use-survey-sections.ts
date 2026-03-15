'use client'
import { useCallback } from 'react'
import { SWR_KEYS } from '../lib/swr'
import {
  createCRUDHook,
  createScopedArrayCRUDConfig,
  buildOptimisticReorder,
} from '../lib/swr/crud-factory'
import type {
  SurveyCustomSection,
  SurveyCustomSectionInsert,
  SurveyCustomSectionUpdate,
} from '@veritio/prototype-test/lib/supabase/study-flow-types'

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

// Add reorder operation (using POST to match backend endpoint)
surveySectionsConfig.bulkOperations = {
  reorder: {
    type: 'reorder',
    url: (baseUrl: string) => `${baseUrl}/reorder`,
    method: 'POST', // Backend expects POST, not the default PUT
    buildOptimisticData: (currentData: any, orderedIds: any) =>
      buildOptimisticReorder(currentData, orderedIds),
  } as any,
}

// Override update method to use PUT instead of PATCH
if (surveySectionsConfig.operations?.update) {
  surveySectionsConfig.operations.update.method = 'PUT'
}

const useSurveySectionsInternal = createCRUDHook(surveySectionsConfig)
export function useSurveySections(studyId: string | null) {
  const result = useSurveySectionsInternal(
    { studyId: studyId || '' },
    { skip: !studyId }
  )

  const sections = result.data

  // Wrap create to match existing API
  const createSection = useCallback(
    async (input: Omit<SurveyCustomSectionInsert, 'study_id'>): Promise<SurveyCustomSection | null> => {
      if (!studyId) return null
      return result.create?.(input) ?? null
    },
    [studyId, result.create]
  )

  // Wrap update to match existing API
  const updateSection = useCallback(
    async (sectionId: string, updates: SurveyCustomSectionUpdate): Promise<SurveyCustomSection | null> => {
      if (!studyId) return null
      return result.update?.(sectionId, updates) ?? null
    },
    [studyId, result.update]
  )

  // Wrap delete to match existing API
  const deleteSection = useCallback(
    async (sectionId: string): Promise<boolean> => {
      if (!studyId) return false
      return result.delete?.(sectionId) ?? false
    },
    [studyId, result.delete]
  )

  // Delete all sections (for cleanup)
  const deleteAllSections = useCallback(
    async (): Promise<boolean> => {
      if (!studyId || sections.length === 0) return true

      // Delete all sections sequentially
      for (const section of sections) {
        await result.delete?.(section.id)
      }

      // Refetch to ensure clean state
      await result.refetch?.()
      return true
    },
    [studyId, sections, result.delete, result.refetch]
  )

  // Wrap reorder to match existing API
  const reorderSections = useCallback(
    async (orderedSectionIds: string[]): Promise<boolean> => {
      if (!studyId) return false
      return (await result.reorder?.(orderedSectionIds)) ?? false
    },
    [studyId, result.reorder]
  )

  // Selectors
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

    // Mutations
    createSection,
    updateSection,
    deleteSection,
    deleteAllSections,
    reorderSections,

    // Selectors
    getSectionById,
    getSectionsByParent,
    getVisibleSections,
  }
}
