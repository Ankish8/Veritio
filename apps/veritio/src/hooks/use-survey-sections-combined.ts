'use client'

import { useSurveySections } from './use-survey-sections'
import { useSurveySectionsUIStore } from '@/stores/survey-sections-ui-store'

/** Combines survey sections data (SWR) with UI state (Zustand). */
export function useSurveySectionsCombined(studyId: string | null) {
  const {
    sections,
    isLoading,
    error,
    refetch,
    createSection,
    updateSection,
    deleteSection,
    reorderSections,
    getSectionById,
    getSectionsByParent,
    getVisibleSections,
  } = useSurveySections(studyId)

  const {
    editingSectionId,
    selectedSectionId,
    setEditingSectionId,
    setSelectedSectionId,
    clearSelection,
    reset: resetUI,
  } = useSurveySectionsUIStore()

  const deleteSectionWithCleanup = async (sectionId: string): Promise<boolean> => {
    const success = await deleteSection(sectionId)
    if (success) {
      if (selectedSectionId === sectionId) {
        setSelectedSectionId(null)
      }
      if (editingSectionId === sectionId) {
        setEditingSectionId(null)
      }
    }
    return success
  }

  const resetAll = () => {
    resetUI()
  }

  return {
    sections,
    isLoading,
    isSaving: false,
    error,

    editingSectionId,
    selectedSectionId,

    createSection,
    updateSection,
    deleteSection: deleteSectionWithCleanup,
    reorderSections,
    refetch,

    setEditingSectionId,
    setSelectedSectionId,
    clearSelection,
    resetAll,

    getSectionById,
    getSectionsByParent,
    getVisibleSections,
  }
}

export type SurveySectionsCombinedReturn = ReturnType<typeof useSurveySectionsCombined>
