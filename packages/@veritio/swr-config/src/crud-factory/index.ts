/**
 * SWR CRUD Hook Factory
 *
 * A factory system for creating standardized SWR hooks with CRUD operations,
 * optimistic updates, and derived selectors from declarative configuration.
 *
 * @example
 * ```tsx
 * import { createCRUDHook, createArrayCRUDConfig } from '@veritio/swr-config/crud-factory'
 *
 * // Create configuration
 * const projectsConfig = createArrayCRUDConfig<ProjectWithCount>({
 *   name: 'project',
 *   keyBuilder: () => '/api/projects',
 *   apiUrlBuilder: () => '/api/projects',
 *   defaultItem: { study_count: 0, is_archived: false },
 * })
 *
 * // Generate hook
 * const useProjects = createCRUDHook(projectsConfig)
 *
 * // Use in component
 * function ProjectList() {
 *   const { data: projects, create, update, delete: deleteProject } = useProjects()
 *   // ...
 * }
 * ```
 */

// Main factory function
export { createCRUDHook } from './create-crud-hook'

// Fetcher registry for dependency injection
export { registerCRUDFetchers, getCRUDFetcherRegistry } from './fetcher-registry'
export type { CRUDFetcherRegistry } from './fetcher-registry'

// Preset configuration helpers
export {
  createArrayCRUDConfig,
  createReadOnlyConfig,
  createScopedArrayCRUDConfig,
  createObjectCRUDConfig,
} from './presets'

// Preset option types
export type {
  ArrayCRUDConfigOptions,
  ReadOnlyConfigOptions,
  ScopedArrayCRUDConfigOptions,
  ObjectCRUDConfigOptions,
} from './presets'

// Optimistic update helpers
export {
  // Array operations
  buildOptimisticPrepend,
  buildOptimisticAppend,
  buildOptimisticMapUpdate,
  buildOptimisticFilterDelete,
  replaceTemporaryItem,
  // Bulk operations
  buildOptimisticBulkUpdate,
  buildOptimisticBulkDelete,
  buildOptimisticReorder,
  // Object operations
  deepMerge,
  buildOptimisticDeepMerge,
  // Utilities
  createTempItem,
  isTempId,
  // Merge helpers
  mergeCreateResult,
  mergeUpdateResult,
  mergeDeleteResult,
} from './optimistic-helpers'

// Type exports
export type {
  // Main config types
  CRUDHookConfig,
  CRUDHookReturn,
  CRUDHookOptions,
  // Operation types
  MutationConfig,
  BulkOperationConfig,
  // Selector/Index types
  SelectorConfig,
  IndexConfig,
  // Supporting types
  FetcherType,
  DataShape,
  CRUDHookReturnBase,
  CRUDOperations,
  BulkOperations,
} from './types'
