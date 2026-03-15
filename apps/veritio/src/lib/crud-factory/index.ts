/**
 * CRUD Factory Module
 *
 * Provides a factory function to generate standardized CRUD services
 * with caching, ownership verification, and error handling.
 *
 * @example
 * ```typescript
 * import { createCrudService, cardsConfig } from './index'
 *
 * const cardService = createCrudService(cardsConfig)
 * const { data, error } = await cardService.list(supabase, studyId)
 * ```
 */

// Factory function
export { createCrudService } from './create-crud-service'

// Types
export type {
  SupabaseClientType,
  EntityConfig,
  CrudService,
  EntityResult,
  ListResult,
  DeleteResult,
  CacheConfig,
  SelectConfig,
  OrderByConfig,
  ErrorHandler,
  FieldTransformers,
  UpsertStrategy,
  TableName,
} from './types'

// Entity configurations
export {
  cardsConfig,
  categoriesConfig,
  treeNodesConfig,
  tasksConfig,
} from './configs/index'

// Entity input/output types
export type {
  CardCreateInput,
  CardBulkItem,
  CategoryCreateInput,
  CategoryBulkItem,
  TreeNodeCreateInput,
  TreeNodeBulkItem,
  TaskCreateInput,
  TaskBulkItem,
  TaskWithCorrectNode,
} from './configs/index'
