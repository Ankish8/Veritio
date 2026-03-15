
import type { CRUDHookConfig, SelectorConfig, IndexConfig } from './types'
import {
  buildOptimisticPrepend,
  buildOptimisticMapUpdate,
  buildOptimisticFilterDelete,
  createTempItem,
  replaceTemporaryItem,
  mergeUpdateResult,
} from './optimistic-helpers'

export interface ArrayCRUDConfigOptions<TItem extends { id: string }> {
  name: string

  keyBuilder: (params: Record<string, unknown>) => string | null

  apiUrlBuilder: (params: Record<string, unknown>) => string

  defaultItem: Partial<TItem>

  selectors?: SelectorConfig<TItem[], unknown>[]

  indexes?: IndexConfig<TItem>[]

  swrOptions?: CRUDHookConfig<TItem[]>['swrOptions']

  createPosition?: 'prepend' | 'append'
}

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

export interface ReadOnlyConfigOptions<TData> {
  name: string

  key: string | ((params: Record<string, unknown>) => string | null)

  defaultValue: TData

  fetcherType?: 'global' | 'globalUnwrap' | 'public'

  swrOptions?: CRUDHookConfig<TData>['swrOptions']
}

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

export interface ScopedArrayCRUDConfigOptions<TItem extends { id: string }>
  extends Omit<ArrayCRUDConfigOptions<TItem>, 'keyBuilder' | 'apiUrlBuilder'> {
  scopeParam: string

  keyBuilder: (scopeId: string) => string

  apiUrlBuilder: (scopeId: string) => string
}

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

export interface ObjectCRUDConfigOptions<TData extends Record<string, unknown>> {
  name: string

  key: string | ((params: Record<string, unknown>) => string | null)

  apiUrl: string

  defaultValue: TData

  swrOptions?: CRUDHookConfig<TData>['swrOptions']

  deepMerge?: boolean
}

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
