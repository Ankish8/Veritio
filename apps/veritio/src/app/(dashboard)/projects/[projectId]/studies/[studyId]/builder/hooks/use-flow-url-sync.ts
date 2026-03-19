'use client'

import { useEffect, useRef } from 'react'
import { useStudyFlowBuilderStore } from '@/stores/study-flow-builder'
import type { ActiveFlowSection } from '@/stores/study-flow-builder'
import type { BuilderTabId } from '@/components/builders/shared'
import type { BuilderNavigationState } from '@/hooks/use-builder-navigation'

interface UseFlowUrlSyncOptions {
  activeTab: BuilderTabId
  urlSection: ActiveFlowSection
  urlQuestionId: string | null
  setNavigation: (nav: Partial<BuilderNavigationState>) => void
}

/**
 * Bidirectional sync between URL parameters and the study flow builder store.
 *
 * On mount: URL -> Store (sets the active flow section and selected question).
 * On store change: Store -> URL (updates URL when user navigates via the UI).
 */
export function useFlowUrlSync({
  activeTab,
  urlSection,
  urlQuestionId,
  setNavigation,
}: UseFlowUrlSyncOptions): void {
  const prevStoreValues = useRef<{ section: ActiveFlowSection; questionId: string | null } | null>(null)
  const hasInitializedFromURL = useRef(false)

  const setActiveFlowSection = useStudyFlowBuilderStore((state) => state.setActiveFlowSection)
  const setSelectedQuestionId = useStudyFlowBuilderStore((state) => state.setSelectedQuestionId)
  const activeFlowSection = useStudyFlowBuilderStore((state) => state.activeFlowSection)
  const selectedQuestionId = useStudyFlowBuilderStore((state) => state.selectedQuestionId)

  // Sync URL -> Store on mount
  useEffect(() => {
    if (hasInitializedFromURL.current) return
    hasInitializedFromURL.current = true

    if (urlSection) {
      setActiveFlowSection(urlSection)
    }
    if (urlQuestionId) {
      setSelectedQuestionId(urlQuestionId)
    }

    prevStoreValues.current = { section: urlSection, questionId: urlQuestionId }
  }, [urlSection, urlQuestionId, setActiveFlowSection, setSelectedQuestionId])

  // Sync Store -> URL when user navigates via UI
  useEffect(() => {
    if (!hasInitializedFromURL.current || !prevStoreValues.current) return

    if (activeTab === 'study-flow') {
      const prev = prevStoreValues.current
      const storeChanged = activeFlowSection !== prev.section || selectedQuestionId !== prev.questionId

      if (storeChanged) {
        setNavigation({
          section: activeFlowSection,
          questionId: selectedQuestionId,
        })
        prevStoreValues.current = { section: activeFlowSection, questionId: selectedQuestionId }
      }
    }
  }, [activeTab, activeFlowSection, selectedQuestionId, setNavigation])
}
