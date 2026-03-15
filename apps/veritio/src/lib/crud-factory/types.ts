import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@veritio/study-types'

export type SupabaseClientType = SupabaseClient<Database>

/**
 * Result type for single entity operations (get, create, update)
 */
export interface EntityResult<T> {
  data: T | null
  error: Error | null
}

/**
 * Result type for list operations
 */
export interface ListResult<T> {
  data: T[] | null
  error: Error | null
}

/**
 * Result type for delete operations
 */
export interface DeleteResult {
  success: boolean
  error: Error | null
}

/**
 * Cache configuration for an entity
 */
export interface CacheConfig {
  /** Function to generate cache key from studyId */
  keyGenerator: (studyId: string) => string
  /** TTL in milliseconds */
  ttl: number
  /** Additional patterns to invalidate (e.g., related entities) */
  invalidatePatterns?: string[]
}

/**
 * Select string configurations for different operations
 */
export interface SelectConfig {
  /** Columns to select for list operation (without ownership join) */
  list: string
  /** Columns to select for list operation (with ownership join) */
  listWithOwnership: string
  /** Columns to select for get operation */
  get: string
  /** Columns to select after create operation */
  create: string
  /** Columns to select after update operation */
  update: string
  /** Columns to select after bulk update operation */
  bulkUpdate: string
}

/**
 * Ordering configuration
 */
export interface OrderByConfig {
  column: string
  ascending: boolean
}

/**
 * Error handler for specific error patterns
 */
export interface ErrorHandler {
  /** Pattern to match in error message */
  pattern: string | RegExp
  /** User-friendly error message to return */
  message: string
}

/**
 * Field transformer functions for entity operations
 */
export interface FieldTransformers<TInput, TBulkItem> {
  /** Transform input for create operation */
  create?: (input: TInput, studyId: string) => Record<string, unknown>
  /** Transform input for update operation */
  update?: (input: Partial<TInput>) => Record<string, unknown>
  /** Transform item for bulk upsert operation */
  bulkItem?: (item: TBulkItem, studyId: string) => Record<string, unknown>
}

/**
 * Upsert strategy for bulk operations
 * - 'parallel': Run individual upserts in parallel (Promise.all) - faster for small sets
 * - 'batch': Single upsert call with all items - better for large sets, handles FK order
 */
export type UpsertStrategy = 'parallel' | 'batch'

/**
 * Table names that the CRUD factory can work with
 */
export type TableName =
  | 'cards'
  | 'categories'
  | 'tree_nodes'
  | 'tasks'
  | 'survey_custom_sections'
  | 'study_segments'

/**
 * Complete configuration for an entity CRUD service
 */
export interface EntityConfig<TRow, TInput, TBulkItem> {
  /** Database table name */
  tableName: TableName
  /** Human-readable entity name for error messages */
  entityName: string
  /** Cache configuration */
  cache: CacheConfig
  /** Select string configurations */
  selects: SelectConfig
  /** Order by configuration */
  orderBy: OrderByConfig
  /** Field transformers for data manipulation */
  fieldTransformers?: FieldTransformers<TInput, TBulkItem>
  /** Error handlers for specific error patterns */
  errorHandlers?: ErrorHandler[]
  /** Upsert strategy for bulk operations */
  upsertStrategy: UpsertStrategy
  /** Build insert data for create operation */
  buildInsertData: (studyId: string, input: TInput) => Record<string, unknown>
  /** Build upsert data for bulk update operation */
  buildUpsertData: (studyId: string, item: TBulkItem) => Record<string, unknown>
  /** Transform list result after fetching (e.g., type casting) */
  transformListResult?: (rows: unknown[]) => TRow[]
}

/**
 * Generated CRUD service interface
 */
export interface CrudService<TRow, TInput, TBulkItem> {
  /** List all entities for a study with optional ownership verification */
  list: (
    supabase: SupabaseClientType,
    studyId: string,
    userId?: string
  ) => Promise<ListResult<TRow>>

  /** Get a single entity by ID */
  get: (
    supabase: SupabaseClientType,
    id: string,
    studyId: string
  ) => Promise<EntityResult<TRow>>

  /** Create a new entity */
  create: (
    supabase: SupabaseClientType,
    studyId: string,
    input: TInput
  ) => Promise<EntityResult<TRow>>

  /** Update an existing entity */
  update: (
    supabase: SupabaseClientType,
    id: string,
    studyId: string,
    input: Partial<TInput>
  ) => Promise<EntityResult<TRow>>

  /** Delete an entity */
  delete: (
    supabase: SupabaseClientType,
    id: string,
    studyId: string
  ) => Promise<DeleteResult>

  /** Bulk update entities (create, update, delete in sync) */
  bulkUpdate: (
    supabase: SupabaseClientType,
    studyId: string,
    items: TBulkItem[]
  ) => Promise<ListResult<TRow>>

  /** Invalidate cache for a study */
  invalidateCache: (studyId: string) => void
}
