'use client'

/**
 * useBuilderSave Hook
 *
 * Slim orchestrator hook that delegates save operations to study-type-specific strategies.
 * Each strategy handles the specific save logic for its study type while sharing common
 * utilities for Yjs collision detection, API handling, and state management.
 *
 * Architecture:
 * - This hook provides the public API (performContentSave)
 * - Strategies handle study-type-specific save logic
 * - Shared utilities handle common operations
 *
 * @see ./save-strategies/ for individual strategy implementations
 */

import { useCallback, useRef } from 'react'
import { useAuthFetch } from '@/hooks'
import { useStudyFlowBuilderStore, selectFlowIsDirty } from '@/stores/study-flow-builder'
import type { Study } from '@veritio/study-types'
import type { BuilderStores } from './use-builder-stores'
import { getSaveStrategy, type SaveResult } from './save-strategies'

// Re-export SaveResult for consumers
export type { SaveResult }

/**
 * Hook for saving study content to the API.
 *
 * Optimized to only save what's actually dirty:
 * - Survey: saves flow settings and questions
 * - Card Sort: saves cards, categories, settings, and flow
 * - Tree Test: saves nodes, tasks, settings, and flow
 * - Prototype Test: saves tasks, prototype metadata, settings, and flow
 * - First Click: saves tasks, settings, and flow
 * - First Impression: saves designs, settings, and flow
 *
 * Note: A/B tests use SWR with immediate saves, so they're handled separately.
 *
 * Uses snapshot-based dirty detection to prevent "Saved" appearing for edits made during save.
 * This is critical for Yjs collaboration - we capture state BEFORE the API call and verify
 * it hasn't changed before marking as saved.
 *
 * @param studyId - The study ID
 * @param study - The study object (for study type)
 * @param stores - Builder stores for status updates
 * @returns Object with performContentSave function
 *
 * @example
 * ```tsx
 * const { performContentSave } = useBuilderSave(studyId, study, stores)
 *
 * // Trigger save (usually from auto-save or manual save button)
 * const result = await performContentSave()
 * if (result.saved) {
 *   console.log('Saved:', result.savedTypes)
 * }
 * ```
 */
export function useBuilderSave(
  studyId: string,
  study: Study | null,
  stores: BuilderStores
) {
  const authFetch = useAuthFetch()

  // Ref to always have latest stores without changing callback identity
  const storesRef = useRef(stores)
  storesRef.current = stores

  const performContentSave = useCallback(async (): Promise<SaveResult> => {
    if (!study) return { saved: false, savedTypes: [] }

    // Get fresh dirty state at execution time to avoid stale closures
    const flowStore = useStudyFlowBuilderStore.getState()
    const isFlowDirty = selectFlowIsDirty(flowStore)

    // Get the appropriate strategy for this study type
    const strategy = getSaveStrategy(study.study_type)

    // Execute the save strategy
    return strategy.save({
      studyId,
      study,
      flowStore,
      isFlowDirty,
      authFetch,
      stores: storesRef.current,
    })
  }, [study, studyId, authFetch])

  return { performContentSave }
}
