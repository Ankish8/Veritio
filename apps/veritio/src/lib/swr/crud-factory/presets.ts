/**
 * SWR CRUD Hook Factory - Preset Configurations
 *
 * Pre-built configuration helpers for common hook patterns.
 * These reduce boilerplate when creating standard CRUD hooks.
 */

import type { CRUDHookConfig, SelectorConfig, IndexConfig } from './types'
import {
  buildOptimisticMapUpdate,
  buildOptimisticFilterDelete,
  createTempItem,
  replaceTemporaryItem,
  mergeUpdateResult,
} from './optimistic-helpers'

// =============================================================================
// ARRAY CRUD PRESET
// =============================================================================

/**
 * Options for creating a standard array CRUD config
 */
export interface ArrayCRUDConfigOptions<TItem extends { id: string }> {
  /** Human-readable name for error messages */
  name: string

  /**
   * Build cache key from params
   * Return null to skip fetching
   */
  keyBuilder: (params: Record<string, unknown>) => string | null

  /**
   * Build API base URL from params
   */
  apiUrlBuilder: (params: Record<string, unknown>) => string

  /**
   * Default values for new items
   * These are merged with create input for optimistic updates
   */
  defaultItem: Partial<TItem>

  /** Optional selectors for derived data */
  selectors?: SelectorConfig<TItem[], unknown>[]

  /** Optional indexes for fast lookups */
  indexes?: IndexConfig<TItem>[]

  /** Optional SWR options */
  swrOptions?: CRUDHookConfig<TItem[]>['swrOptions']

  /**
   * Create position strategy: 'prepend' or 'append'
   * Default: 'prepend' (new items first)
   */
  createPosition?: 'prepend' | 'append'
}

/**
 * Create a standard array CRUD configuration
 *
 * Includes:
 * - Create with optimistic prepend/append
 * - Update with optimistic map-update
 * - Delete with optimistic filter-delete
 * - Automatic temp ID handling
 *
 * @example
 * ```tsx
 * const projectsConfig = createArrayCRUDConfig<ProjectWithCount>({
 *   name: 'project',
 *   keyBuilder: () => '/api/projects',
 *   apiUrlBuilder: () => '/api/projects',
 *   defaultItem: { study_count: 0, is_archived: false },
 * })
 *
 * const useProjects = createCRUDHook(projectsConfig)
 * ```
 */
export function createArrayCRUDConfig<TItem extends { id: string }>(
  options: ArrayCRUDConfigOptions<TItem>
): CRUDHookConfig<TItem[], TItem, Partial<TItem>, Partial<TItem>> {
  const createPosition = options.createPosition ?? 'prepend'

  return {
    name: options.name,
    dataShape: 'array',
    key: {
      base: options.keyBuilder,
    },
    fetcher: { type: 'global' },
    apiBaseUrl: options.apiUrlBuilder,
    swrOptions: options.swrOptions,
    defaultValue: [],

    operations: {
      // CREATE
      create: {
        method: 'POST',
        url: (baseUrl) => baseUrl,
        buildOptimisticData: (currentData, input) => {
          const tempItem = createTempItem<TItem>(input, options.defaultItem)
          // Use Array.isArray() instead of || [] because currentData could be
          // a truthy non-array (e.g., {} or { data: [...] }) from SWR states
          const safeData = Array.isArray(currentData) ? currentData : []
          return createPosition === 'prepend'
            ? [tempItem, ...safeData]
            : [...safeData, tempItem]
        },
        mergeResult: (currentData, result) => {
          return replaceTemporaryItem(currentData, result)
        },
      },

      // UPDATE
      update: {
        method: 'PATCH',
        url: (baseUrl, _input, itemId) => `${baseUrl}/${itemId}`,
        buildOptimisticData: (currentData, input, itemId) => {
          return buildOptimisticMapUpdate(currentData, itemId!, {
            ...input,
            updated_at: new Date().toISOString(),
          } as Partial<TItem>)
        },
        mergeResult: mergeUpdateResult,
      },

      // DELETE
      delete: {
        method: 'DELETE',
        url: (baseUrl, _input, itemId) => `${baseUrl}/${itemId}`,
        buildOptimisticData: (currentData, _input, itemId) => {
          return buildOptimisticFilterDelete(currentData, itemId!)
        },
      },
    },

    indexes: options.indexes,
    selectors: options.selectors,
  }
}

// =============================================================================
// READ-ONLY PRESET
// =============================================================================

/**
 * Options for creating a read-only config
 */
export interface ReadOnlyConfigOptions<TData> {
  /** Human-readable name for error messages */
  name: string

  /**
   * Cache key - static string or builder function
   */
  key: string | ((params: Record<string, unknown>) => string | null)

  /** Default value when data is loading/unavailable */
  defaultValue: TData

  /** Fetcher type to use */
  fetcherType?: 'global' | 'globalUnwrap' | 'public'

  /** Optional SWR options */
  swrOptions?: CRUDHookConfig<TData>['swrOptions']
}

/**
 * Create a read-only configuration (no mutations)
 *
 * Use for:
 * - Dashboard stats
 * - Single entity fetches
 * - Public/participant endpoints
 *
 * @example
 * ```tsx
 * const dashboardConfig = createReadOnlyConfig<DashboardData>({
 *   name: 'dashboard',
 *   key: '/api/dashboard/stats',
 *   defaultValue: { projects: 0, studies: 0, responses: 0 },
 * })
 *
 * const useDashboard = createCRUDHook(dashboardConfig)
 * ```
 */
export function createReadOnlyConfig<TData>(
  options: ReadOnlyConfigOptions<TData>
): CRUDHookConfig<TData, never, never, never> {
  return {
    name: options.name,
    dataShape:
      typeof options.defaultValue === 'object' && !Array.isArray(options.defaultValue)
        ? 'object'
        : 'array',
    key: {
      base: options.key,
    },
    fetcher: { type: options.fetcherType ?? 'global' },
    apiBaseUrl: '', // Not used for read-only
    swrOptions: options.swrOptions,
    defaultValue: options.defaultValue,
    // No operations - read-only
  }
}

// =============================================================================
// SCOPED ARRAY CRUD PRESET
// =============================================================================

/**
 * Options for creating a scoped array CRUD config
 * (e.g., studies scoped to a project)
 */
export interface ScopedArrayCRUDConfigOptions<TItem extends { id: string }>
  extends Omit<ArrayCRUDConfigOptions<TItem>, 'keyBuilder' | 'apiUrlBuilder'> {
  /**
   * Parameter name used for scoping (e.g., 'projectId', 'studyId')
   */
  scopeParam: string

  /**
   * Build cache key from scope parameter
   */
  keyBuilder: (scopeId: string) => string

  /**
   * Build API base URL from scope parameter
   */
  apiUrlBuilder: (scopeId: string) => string
}

/**
 * Create a scoped array CRUD configuration
 *
 * Use for entities that belong to a parent:
 * - Studies belonging to a project
 * - Sections belonging to a study
 *
 * @example
 * ```tsx
 * const studiesConfig = createScopedArrayCRUDConfig<StudyWithCount>({
 *   name: 'study',
 *   scopeParam: 'projectId',
 *   keyBuilder: (projectId) => `/api/projects/${projectId}/studies`,
 *   apiUrlBuilder: (projectId) => `/api/projects/${projectId}/studies`,
 *   defaultItem: { response_count: 0 },
 * })
 *
 * const useStudies = createCRUDHook(studiesConfig)
 *
 * // Usage
 * const { data } = useStudies({ projectId: '123' })
 * ```
 */
export function createScopedArrayCRUDConfig<TItem extends { id: string }>(
  options: ScopedArrayCRUDConfigOptions<TItem>
): CRUDHookConfig<TItem[], TItem, Partial<TItem>, Partial<TItem>> {
  const baseConfig = createArrayCRUDConfig({
    ...options,
    keyBuilder: (params) => {
      const scopeId = params[options.scopeParam] as string | undefined
      if (!scopeId) return null
      return options.keyBuilder(scopeId)
    },
    apiUrlBuilder: (params) => {
      const scopeId = params[options.scopeParam] as string
      return options.apiUrlBuilder(scopeId)
    },
  })

  return baseConfig
}

// =============================================================================
// OBJECT/PREFERENCES PRESET
// =============================================================================

/**
 * Options for creating an object/preferences config
 */
export interface ObjectCRUDConfigOptions<TData extends Record<string, unknown>> {
  /** Human-readable name for error messages */
  name: string

  /**
   * Cache key - static string or builder function
   */
  key: string | ((params: Record<string, unknown>) => string | null)

  /** API endpoint for updates */
  apiUrl: string

  /** Default value when data is loading/unavailable */
  defaultValue: TData

  /** Optional SWR options */
  swrOptions?: CRUDHookConfig<TData>['swrOptions']

  /**
   * Deep merge updates (for nested preferences)
   * Default: true
   */
  deepMerge?: boolean
}

/**
 * Create an object/preferences configuration
 *
 * Supports partial updates with optional deep merging.
 * Use for user preferences, settings, and other object-shaped data.
 *
 * @example
 * ```tsx
 * const preferencesConfig = createObjectCRUDConfig<UserPreferences>({
 *   name: 'preferences',
 *   key: '/api/user/preferences',
 *   apiUrl: '/api/user/preferences',
 *   defaultValue: { theme: 'system', notifications: {} },
 *   deepMerge: true,
 * })
 *
 * const usePreferences = createCRUDHook(preferencesConfig)
 * ```
 */
export function createObjectCRUDConfig<TData extends Record<string, unknown>>(
  options: ObjectCRUDConfigOptions<TData>
): CRUDHookConfig<TData, never, Partial<TData>, Partial<TData>> {
  const deepMerge = options.deepMerge ?? true

  // Deep merge helper
  const mergeDeep = (target: TData, source: Partial<TData>): TData => {
    if (!deepMerge) {
      return { ...target, ...source }
    }

    const result = { ...target }
    for (const key in source) {
      const sourceValue = source[key]
      const targetValue = result[key]

      if (sourceValue === undefined) continue

      if (
        typeof sourceValue === 'object' &&
        sourceValue !== null &&
        !Array.isArray(sourceValue) &&
        typeof targetValue === 'object' &&
        targetValue !== null &&
        !Array.isArray(targetValue)
      ) {
        result[key] = mergeDeep(
          targetValue as TData,
          sourceValue as Partial<TData>
        ) as TData[Extract<keyof TData, string>]
      } else {
        result[key] = sourceValue as TData[Extract<keyof TData, string>]
      }
    }
    return result
  }

  return {
    name: options.name,
    dataShape: 'object',
    key: {
      base: options.key,
    },
    fetcher: { type: 'global' },
    apiBaseUrl: options.apiUrl,
    swrOptions: options.swrOptions,
    defaultValue: options.defaultValue,

    operations: {
      // UPDATE (object data uses update for partial updates)
      update: {
        method: 'PATCH',
        url: (baseUrl) => baseUrl,
        buildOptimisticData: (currentData, input) => {
          if (!currentData) return undefined
          return mergeDeep(currentData, input as Partial<TData>)
        },
        mergeResult: (currentData, result) => {
          // API returns full updated object
          return result as unknown as TData
        },
      },
    },
  }
}
