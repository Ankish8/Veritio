/**
 * Prototype Test Builder Store
 *
 * Re-exports from @veritio/prototype-test package to ensure a single store instance.
 * The package's store is the canonical source — UI components (TaskList, PathwayBuilderModal)
 * and save infrastructure must share the same Zustand store for dirty detection to work.
 */
export {
  usePrototypeTestBuilderStore,
  usePrototypeTestIsDirty,
  selectPrototypeTestIsDirty,
  // Granular selectors
  usePrototypeTestPrototype,
  usePrototypeTestFrames,
  usePrototypeTestTasks,
  usePrototypeTestSettings,
  usePrototypeTestStudyId,
  usePrototypeTestSaveStatus,
  usePrototypeTestIsHydrated,
  usePrototypeTestIsSyncing,
  usePrototypeTestLastSavedAt,
  usePrototypeTestActions,
} from '@veritio/prototype-test/stores/prototype-test-builder'

export type { SaveStatus } from '@veritio/prototype-test/stores/prototype-test-builder'
