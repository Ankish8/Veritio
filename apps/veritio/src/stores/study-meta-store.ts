/**
 * Study Meta Store
 *
 * Re-exports from @veritio/prototype-test package to ensure a single store instance.
 * The package's store is the canonical source — UI components and save infrastructure
 * must share the same Zustand store for dirty detection to work.
 */
export {
  useStudyMetaStore,
  selectMetaIsDirty,
  useMetaIsDirty,
} from '@veritio/prototype-test/stores/study-meta-store'
