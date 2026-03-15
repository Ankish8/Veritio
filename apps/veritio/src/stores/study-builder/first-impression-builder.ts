/**
 * First Impression Test Builder Store
 *
 * Re-exports from @veritio/prototype-test package to ensure a single store instance.
 * The package's store is the canonical source — UI components and save infrastructure
 * must share the same Zustand store for dirty detection to work.
 */
export {
  useFirstImpressionBuilderStore,
  useFirstImpressionIsDirty,
  selectFirstImpressionIsDirty,
  // Granular selectors for performance optimization
  useFirstImpressionDesigns,
  useFirstImpressionSettings,
  useFirstImpressionStudyId,
  useFirstImpressionSaveStatus,
  useFirstImpressionIsHydrated,
  useFirstImpressionLastSavedAt,
  useFirstImpressionDesign,
  useFirstImpressionActions,
  // Computed selectors
  useFirstImpressionNonPracticeDesigns,
  useFirstImpressionPracticeDesign,
  useFirstImpressionTotalWeight,
  useFirstImpressionSharedQuestions,
} from '@veritio/prototype-test/stores/first-impression-builder'
