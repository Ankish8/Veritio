/**
 * Tree Test Builder Store
 *
 * Re-exports from @veritio/prototype-test package to ensure a single store instance.
 * The package's store is the canonical source — UI components and save infrastructure
 * must share the same Zustand store for dirty detection to work.
 */
export {
  useTreeTestBuilderStore,
  useTreeTestIsDirty,
  selectTreeTestIsDirty,
  // Granular selectors for performance optimization
  useTreeTestNodes,
  useTreeTestTasks,
  useTreeTestSettings,
  useTreeTestExpandedNodes,
  useTreeTestStudyId,
  useTreeTestSaveStatus,
  useTreeTestIsHydrated,
  useTreeTestLastSavedAt,
  useTreeTestActions,
} from '@veritio/prototype-test/stores/tree-test-builder'
