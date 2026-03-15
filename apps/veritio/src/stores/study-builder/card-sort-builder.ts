/**
 * Card Sort Builder Store
 *
 * Re-exports from @veritio/prototype-test package to ensure a single store instance.
 * The package's store is the canonical source — UI components and save infrastructure
 * must share the same Zustand store for dirty detection to work.
 */
export {
  useCardSortBuilderStore,
  useCardSortIsDirty,
  selectCardSortIsDirty,
  // Granular selectors for performance optimization
  useCardSortCards,
  useCardSortCategories,
  useCardSortSettings,
  useCardSortStudyId,
  useCardSortSaveStatus,
  useCardSortIsHydrated,
  useCardSortLastSavedAt,
  useCardSortActions,
} from '@veritio/prototype-test/stores/card-sort-builder'

export type { SaveStatus } from '@veritio/prototype-test/stores/card-sort-builder'
