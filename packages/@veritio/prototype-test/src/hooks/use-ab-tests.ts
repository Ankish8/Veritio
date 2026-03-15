'use client'
import { useCallback, useMemo, useState } from 'react'
import { SWR_KEYS } from '@veritio/prototype-test/lib/swr'
import { createCRUDHook, createScopedArrayCRUDConfig } from '@veritio/prototype-test/lib/swr/crud-factory'
import type { ABTestVariant } from '@veritio/prototype-test/lib/supabase/study-flow-types'
import type { Json } from '@veritio/prototype-test/lib/supabase/types'
// TYPES
type ABTestUpdateInput = {
  variant_a_content?: Json
  variant_b_content?: Json
  split_percentage?: number
  is_enabled?: boolean
}
// CONFIGURATION
const abTestsConfig = createScopedArrayCRUDConfig<ABTestVariant>({
  name: 'A/B test',
  scopeParam: 'studyId',
  keyBuilder: (studyId) => SWR_KEYS.abTests(studyId),
  apiUrlBuilder: (studyId) => `/api/studies/${studyId}/ab-tests`,
  defaultItem: {
    entity_type: 'question',
    split_percentage: 50,
    is_enabled: true,
  },
  createPosition: 'append',
  // Index by entity_id for quick question-based lookups
  indexes: [
    { name: 'byId', keyExtractor: (t) => t.id },
    { name: 'byEntityId', keyExtractor: (t) => t.entity_id },
  ],
})

// CRITICAL: Override fetcher to use globalUnwrap for proper data extraction
// The LIST API returns { data: ABTestVariant[] }, so we need to unwrap it
abTestsConfig.fetcher = { type: 'globalUnwrap' }

// Override to wrap response in { data: ... } format for mutations
if (abTestsConfig.operations?.create) {
  abTestsConfig.operations.create.transformResponse = (response) =>
    (response as { data: ABTestVariant }).data
}
if (abTestsConfig.operations?.update) {
  abTestsConfig.operations.update.transformResponse = (response) =>
    (response as { data: ABTestVariant }).data
}
// HOOK IMPLEMENTATION
const useABTestsInternal = createCRUDHook(abTestsConfig)
const globalPendingCreates = new Set<string>()
export function useABTests(studyId: string | null) {
  const result = useABTestsInternal(
    { studyId: studyId || '' },
    { skip: !studyId }
  )

  // Ensure abTests is always an array (CRUD factory may return undefined initially)
  const abTests = Array.isArray(result.data) ? result.data : []

  // Build entity_id -> ABTestVariant map for quick lookups
  const abTestsMap = useMemo<Record<string, ABTestVariant>>(() => {
    const map: Record<string, ABTestVariant> = {}
    if (!Array.isArray(abTests)) return map
    for (const test of abTests) {
      map[test.entity_id] = test
    }
    return map
  }, [abTests])

  // Track if any mutation is in progress (for UI feedback)
  const [isMutating, setIsMutating] = useState(false)

  // Get A/B test for a specific question
  const getABTestForQuestion = useCallback(
    (questionId: string): ABTestVariant | null => abTestsMap[questionId] || null,
    [abTestsMap]
  )

  // Check if a question has an active A/B test
  const hasABTest = useCallback(
    (questionId: string): boolean => !!abTestsMap[questionId],
    [abTestsMap]
  )

  // Create a new A/B test for a question
  const createABTest = useCallback(
    async (
      questionId: string,
      variantAContent: Json,
      variantBContent: Json
    ): Promise<ABTestVariant | null> => {
      if (!studyId) return null

      // Composite key to track pending creates across all hook instances
      const pendingKey = `${studyId}:${questionId}`

      // CRITICAL: Don't allow creates while data is still loading
      // This prevents creating duplicates when we don't know what exists yet
      if (result.isLoading) {
        // A/B tests still loading, skipping creation
        return null
      }

      // Prevent duplicate creation - check if A/B test already exists
      if (abTestsMap[questionId]) {
        // A/B test already exists, skipping creation
        return abTestsMap[questionId]
      }

      // Prevent race condition - check if create is already in-flight (globally)
      // This check is synchronous and shared across all hook instances
      if (globalPendingCreates.has(pendingKey)) {
        // A/B test creation already in progress, skipping
        return null
      }

      // Mark as in-flight SYNCHRONOUSLY before any async operations
      globalPendingCreates.add(pendingKey)
      setIsMutating(true)

      try {
        // Cast to Partial<ABTestVariant> - API accepts Json but factory expects typed variant
        const input = {
          entity_type: 'question' as const,
          entity_id: questionId,
          variant_a_content: variantAContent,
          variant_b_content: variantBContent,
          split_percentage: 50,
          is_enabled: true,
        } as unknown as Partial<ABTestVariant>

        return await result.create?.(input) ?? null
      } finally {
        // Always clear the pending flag when done (success or failure)
        globalPendingCreates.delete(pendingKey)
        setIsMutating(false)
      }
    },
    [studyId, result.create, result.isLoading, abTestsMap]
  )

  // Update an existing A/B test by question ID
  const updateABTest = useCallback(
    async (questionId: string, updates: ABTestUpdateInput): Promise<boolean> => {
      if (!studyId) return false

      const existingTest = abTestsMap[questionId]
      if (!existingTest) return false

      // CRITICAL: Don't allow updates on temporary IDs (UUID validation will fail)
      if (existingTest.id.startsWith('temp')) {
        // Skipping AB test update - waiting for real ID
        return false
      }

      // Cast to Partial<ABTestVariant> - API accepts Json but factory expects typed variant
      const typedUpdates = updates as unknown as Partial<ABTestVariant>
      const updated = await result.update?.(existingTest.id, typedUpdates)
      return updated !== null
    },
    [studyId, abTestsMap, result.update]
  )

  // Delete an A/B test by question ID
  const deleteABTest = useCallback(
    async (questionId: string): Promise<boolean> => {
      if (!studyId) return false

      const existingTest = abTestsMap[questionId]
      if (!existingTest) return false

      // CRITICAL: Don't allow deletes on temporary IDs (UUID validation will fail)
      if (existingTest.id.startsWith('temp')) {
        // Skipping AB test delete - waiting for real ID
        return false
      }

      setIsMutating(true)
      try {
        return await result.delete?.(existingTest.id) ?? false
      } finally {
        setIsMutating(false)
      }
    },
    [studyId, abTestsMap, result.delete]
  )

  return {
    abTests,
    abTestsMap,
    isLoading: result.isLoading,
    isSaving: result.isValidating,
    isMutating, // True while create/delete is in progress - use to disable UI
    error: result.error,
    refetch: result.refetch,
    mutate: result.mutate, // Expose mutate for direct cache updates (for real-time sync)

    // Lookups
    getABTestForQuestion,
    hasABTest,

    // Mutations (save immediately)
    createABTest,
    updateABTest,
    deleteABTest,
  }
}
export function useABTestForQuestion(studyId: string | null, questionId: string) {
  const { abTestsMap, isLoading, error } = useABTests(studyId)
  return {
    abTest: abTestsMap[questionId] || null,
    isLoading,
    error,
  }
}
export function useHasABTest(studyId: string | null, questionId: string) {
  const { abTestsMap } = useABTests(studyId)
  return !!abTestsMap[questionId]
}
