'use client'

import { useCallback, useMemo, useState } from 'react'
import { SWR_KEYS } from '@/lib/swr'
import { createCRUDHook, createScopedArrayCRUDConfig } from '@/lib/swr/crud-factory'
import type { ABTestVariant } from '@veritio/study-types/study-flow-types'
import type { Json } from '@veritio/study-types'

type ABTestUpdateInput = {
  variant_a_content?: Json
  variant_b_content?: Json
  split_percentage?: number
  is_enabled?: boolean
}

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

const useABTestsInternal = createCRUDHook(abTestsConfig)

// Module-scoped to share across all hook instances (useRef would be per-instance)
const globalPendingCreates = new Set<string>()

/** Hook to fetch and manage A/B tests with SWR caching. Saves immediately with optimistic UI. */
export function useABTests(studyId: string | null) {
  const result = useABTestsInternal(
    { studyId: studyId || '' },
    { skip: !studyId }
  )

  // Build entity_id -> ABTestVariant map for quick lookups
  const abTestsMap = useMemo<Record<string, ABTestVariant>>(() => {
    const map: Record<string, ABTestVariant> = {}
    const abTestsArr = Array.isArray(result.data) ? result.data : []
    for (const test of abTestsArr) {
      map[test.entity_id] = test
    }
    return map
  }, [result.data])

  // Ensure abTests is always an array (CRUD factory may return undefined initially)
  const abTests = useMemo(() => Array.isArray(result.data) ? result.data : [], [result.data])

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

      if (result.isLoading) return null

      if (abTestsMap[questionId]) return abTestsMap[questionId]

      if (globalPendingCreates.has(pendingKey)) return null

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
    [studyId, result, abTestsMap]
  )

  // Update an existing A/B test by question ID
  const updateABTest = useCallback(
    async (questionId: string, updates: ABTestUpdateInput): Promise<boolean> => {
      if (!studyId) return false

      const existingTest = abTestsMap[questionId]
      if (!existingTest) return false

      // Don't allow updates on temporary IDs (UUID validation will fail)
      if (existingTest.id.startsWith('temp')) return false

      // Cast to Partial<ABTestVariant> - API accepts Json but factory expects typed variant
      const typedUpdates = updates as unknown as Partial<ABTestVariant>
      const updated = await result.update?.(existingTest.id, typedUpdates)
      return updated !== null
    },
    [studyId, abTestsMap, result]
  )

  // Delete an A/B test by question ID
  const deleteABTest = useCallback(
    async (questionId: string): Promise<boolean> => {
      if (!studyId) return false

      const existingTest = abTestsMap[questionId]
      if (!existingTest) return false

      // Don't allow deletes on temporary IDs (UUID validation will fail)
      if (existingTest.id.startsWith('temp')) return false

      setIsMutating(true)
      try {
        return await result.delete?.(existingTest.id) ?? false
      } finally {
        setIsMutating(false)
      }
    },
    [studyId, abTestsMap, result]
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
