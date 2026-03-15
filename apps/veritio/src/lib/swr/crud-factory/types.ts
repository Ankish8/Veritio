/**
 * SWR CRUD Hook Factory - Type Definitions
 *
 * Provides TypeScript interfaces for creating standardized SWR hooks
 * with CRUD operations, optimistic updates, and selectors.
 */

import type { SWRConfiguration, KeyedMutator } from 'swr'

// =============================================================================
// FETCHER TYPES
// =============================================================================

/**
 * Supported fetcher types for SWR hooks
 */
export type FetcherType = 'global' | 'globalUnwrap' | 'public' | 'custom'

/**
 * Data shape the hook manages
 */
export type DataShape = 'array' | 'object'

// =============================================================================
// MUTATION CONFIGURATION
// =============================================================================

/**
 * Configuration for a single mutation operation (create/update/delete)
 */
export interface MutationConfig<TData, TInput, TResult = unknown> {
  /** HTTP method for the mutation */
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE'

  /**
   * URL builder function
   * @param baseUrl - Base API URL
   * @param input - Mutation input data
   * @param itemId - Optional item ID (for update/delete)
   */
  url: (baseUrl: string, input: TInput, itemId?: string) => string

  /**
   * Build optimistic data for immediate UI update
   * @param currentData - Current SWR cache data
   * @param input - Mutation input
   * @param itemId - Optional item ID
   */
  buildOptimisticData: (
    currentData: TData | undefined,
    input: TInput,
    itemId?: string
  ) => TData | undefined

  /**
   * Merge API result back into the cache
   * If not provided, the optimistic data is kept
   */
  mergeResult?: (
    currentData: TData | undefined,
    result: TResult,
    input: TInput,
    itemId?: string
  ) => TData

  /**
   * Transform API response before storing
   */
  transformResponse?: (response: unknown) => TResult
}

/**
 * Configuration for bulk operations (update/delete multiple items)
 */
export interface BulkOperationConfig<TData, TItem> {
  /** Operation type */
  type: 'update' | 'delete' | 'reorder'

  /** URL builder for bulk endpoint */
  url: (baseUrl: string) => string

  /** Optional HTTP method override (defaults based on type: PATCH for update, DELETE for delete, PUT for reorder) */
  method?: 'POST' | 'PUT' | 'PATCH' | 'DELETE'

  /**
   * Build optimistic data for bulk operation
   * @param currentData - Current cache data
   * @param itemIds - IDs of items to operate on
   * @param updates - Optional updates for bulk update
   */
  buildOptimisticData: (
    currentData: TData | undefined,
    itemIds: string[],
    updates?: Partial<TItem>
  ) => TData | undefined
}

// =============================================================================
// SELECTOR & INDEX CONFIGURATION
// =============================================================================

/**
 * Configuration for creating a memoized selector
 */
export interface SelectorConfig<TData, TSelected> {
  /** Selector name - becomes a method on the hook return */
  name: string

  /**
   * Select/transform function
   * @param data - Current cache data
   * @param args - Additional arguments passed when calling
   */
  select: (data: TData | undefined, ...args: unknown[]) => TSelected
}

/**
 * Configuration for creating an index (map) for fast lookups
 */
export interface IndexConfig<TItem> {
  /** Index name - becomes a property on hook return (e.g., 'byId') */
  name: string

  /** Extract key from item for the index */
  keyExtractor: (item: TItem) => string
}

// =============================================================================
// MAIN HOOK CONFIGURATION
// =============================================================================

/**
 * Main configuration interface for creating a CRUD hook
 *
 * @template TData - The full data type (array or object)
 * @template TItem - Individual item type (for arrays)
 * @template TCreateInput - Input type for create operation
 * @template TUpdateInput - Input type for update operation
 */
export interface CRUDHookConfig<
  TData,
  TItem extends { id: string } = TData extends (infer U)[]
    ? U extends { id: string }
      ? U
      : never
    : never,
  TCreateInput = Partial<TItem>,
  TUpdateInput = Partial<TItem>
> {
  /** Human-readable name for error messages */
  name: string

  /** Data shape: 'array' for lists, 'object' for single entities */
  dataShape: DataShape

  /**
   * Cache key configuration
   */
  key: {
    /**
     * Static key string or function that builds key from params
     * Return null to skip fetching (conditional fetch)
     */
    base: string | ((params: Record<string, unknown>) => string | null)
  }

  /**
   * Fetcher configuration
   */
  fetcher: {
    /** Fetcher type to use */
    type: FetcherType

    /** Custom fetcher function (required if type is 'custom') */
    custom?: <T>(url: string) => Promise<T>
  }

  /**
   * Base URL for mutation endpoints
   * Can be static or built from params
   */
  apiBaseUrl: string | ((params: Record<string, unknown>) => string)

  /**
   * SWR configuration overrides
   */
  swrOptions?: Partial<SWRConfiguration>

  /**
   * Default value when data is undefined
   */
  defaultValue: TData

  /**
   * CRUD operation configurations
   */
  operations?: {
    create?: MutationConfig<TData, TCreateInput, TItem>
    update?: MutationConfig<TData, TUpdateInput, TItem>
    delete?: MutationConfig<TData, string, void>
  }

  /**
   * Bulk operation configurations
   */
  bulkOperations?: {
    bulkUpdate?: BulkOperationConfig<TData, TItem>
    bulkDelete?: BulkOperationConfig<TData, TItem>
    reorder?: BulkOperationConfig<TData, TItem>
  }

  /**
   * Index configurations for fast lookups
   * Only applicable for array data shape
   */
  indexes?: IndexConfig<TItem>[]

  /**
   * Selector configurations for derived data
   */
  selectors?: SelectorConfig<TData, unknown>[]

  /**
   * Transform error to user-friendly message
   */
  errorTransformer?: (error: Error) => string
}

// =============================================================================
// HOOK RETURN TYPE
// =============================================================================

/**
 * Base return type for CRUD hooks
 */
export interface CRUDHookReturnBase<TData> {
  /** The fetched data (or default value if loading) */
  data: TData

  /** Loading state for initial fetch */
  isLoading: boolean

  /** Validating state (revalidating in background) */
  isValidating: boolean

  /** Error message if fetch failed */
  error: string | null

  /** Manually trigger refetch */
  refetch: () => void

  /** Direct access to SWR mutate */
  mutate: KeyedMutator<TData>
}

/**
 * CRUD operations that may be present on hook return
 */
export interface CRUDOperations<TItem, TCreateInput, TUpdateInput> {
  /** Create a new item */
  create?: (input: TCreateInput) => Promise<TItem | null>

  /** Update an existing item */
  update?: (id: string, input: TUpdateInput) => Promise<TItem | null>

  /** Delete an item */
  delete?: (id: string) => Promise<boolean>
}

/**
 * Bulk operations that may be present on hook return
 */
export interface BulkOperations<TItem> {
  /** Update multiple items */
  bulkUpdate?: (ids: string[], updates: Partial<TItem>) => Promise<boolean>

  /** Delete multiple items */
  bulkDelete?: (ids: string[]) => Promise<boolean>

  /** Reorder items */
  reorder?: (orderedIds: string[]) => Promise<boolean>
}

/**
 * Full return type combining all possible properties
 *
 * Note: Indexes and selectors are added dynamically based on config
 */
export type CRUDHookReturn<
  TData,
  TItem extends { id: string },
  TCreateInput,
  TUpdateInput
> = CRUDHookReturnBase<TData> &
  CRUDOperations<TItem, TCreateInput, TUpdateInput> &
  BulkOperations<TItem> & {
    /** Dynamic indexes and selectors */
    [key: string]: unknown
  }

// =============================================================================
// HOOK OPTIONS
// =============================================================================

/**
 * Options passed when calling a generated hook
 */
export interface CRUDHookOptions<TData> {
  /** Initial/fallback data for SSR or loading state */
  initialData?: TData

  /** Skip fetching (useful for conditional data loading) */
  skip?: boolean
}
