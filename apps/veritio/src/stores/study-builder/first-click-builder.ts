/**
 * First-Click Test Builder Store
 *
 * Re-exports from @veritio/prototype-test package to ensure a single store instance.
 * The package's store is the canonical source — UI components and save infrastructure
 * must share the same Zustand store for dirty detection to work.
 */
export {
  useFirstClickBuilderStore,
  useFirstClickIsDirty,
  selectFirstClickIsDirty,
  // Granular selectors for performance optimization
  useFirstClickTasks,
  useFirstClickSettings,
  useFirstClickStudyId,
  useFirstClickSaveStatus,
  useFirstClickIsHydrated,
  useFirstClickLastSavedAt,
  useFirstClickActions,
} from '@veritio/prototype-test/stores/first-click-builder'

export type { FirstClickTaskWithDetails, SaveStatus } from '@veritio/prototype-test/stores/first-click-builder'
