'use client'
import useSWR from 'swr'
import { useCallback, useMemo } from 'react'
import { getAuthFetchInstance, swrFetcher, swrFetcherUnwrap, publicFetcher } from '../fetcher'
import type {
  CRUDHookConfig,
  CRUDHookReturn,
  CRUDHookOptions,
  FetcherType,
} from './types'
// FETCHER SELECTION
function selectFetcher(type: FetcherType, customFetcher?: <T>(url: string) => Promise<T>) {
  switch (type) {
    case 'global':
      return null // Uses SWRConfig default
    case 'globalUnwrap':
      return swrFetcherUnwrap
    case 'public':
      return publicFetcher
    case 'custom':
      return customFetcher ?? null
    default:
      return null
  }
}
// FACTORY FUNCTION
export function createCRUDHook<
  TData,
  TItem extends { id: string } = TData extends (infer U)[]
    ? U extends { id: string }
      ? U
      : never
    : never,
  TCreateInput = Partial<TItem>,
  TUpdateInput = Partial<TItem>
>(config: CRUDHookConfig<TData, TItem, TCreateInput, TUpdateInput>) {
  // Return the hook function
  return function useCRUDHook(
    params: Record<string, unknown> = {},
    options?: CRUDHookOptions<TData>
  ): CRUDHookReturn<TData, TItem, TCreateInput, TUpdateInput> {
    // KEY COMPUTATION

    const cacheKey = useMemo(() => {
      // Skip fetching if explicitly requested
      if (options?.skip) return null

      // Build key from config
      if (typeof config.key.base === 'function') {
        return config.key.base(params)
      }
      return config.key.base
    }, [params, options?.skip])
    // SWR HOOK

    const fetcher = selectFetcher(config.fetcher.type, config.fetcher.custom)

    const { data, error, isLoading, isValidating, mutate } = useSWR<TData>(
      cacheKey,
      fetcher,
      {
        fallbackData: options?.initialData,
        ...config.swrOptions,
      }
    )
    // AUTH FETCH FOR MUTATIONS

    const authFetch = getAuthFetchInstance()

    // Build API base URL from params
    const apiBaseUrl = useMemo(() => {
      if (typeof config.apiBaseUrl === 'function') {
        return config.apiBaseUrl(params)
      }
      return config.apiBaseUrl
    }, [params])
    // CREATE OPERATION

    // PERFORMANCE: Using optimisticData as a function avoids needing `data` in deps
    // This prevents callback recreation on every fetch, reducing re-renders
    const create = config.operations?.create
      ? useCallback(
          async (input: TCreateInput): Promise<TItem | null> => {
            const createConfig = config.operations!.create!
            let createdItem: TItem | null = null

            await mutate(
              async (currentData) => {
                const url = createConfig.url(apiBaseUrl, input)
                const response = await authFetch(url, {
                  method: createConfig.method,
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(input),
                })

                if (!response.ok) {
                  const errorData = await response.json().catch(() => ({}))
                  throw new Error(
                    errorData.error || `Failed to create ${config.name}`
                  )
                }

                const result = await response.json()
                createdItem = createConfig.transformResponse
                  ? createConfig.transformResponse(result)
                  : result

                // Merge result into cache
                if (createConfig.mergeResult) {
                  return createConfig.mergeResult(
                    currentData,
                    createdItem!,
                    input
                  )
                }

                return currentData
              },
              {
                // Use function form to avoid data dependency
                optimisticData: (currentData) =>
                  createConfig.buildOptimisticData(currentData, input) as TData,
                rollbackOnError: true,
                revalidate: false,
              }
            )

            return createdItem
          },
          [apiBaseUrl, authFetch, mutate]
        )
      : undefined
    // UPDATE OPERATION

    const update = config.operations?.update
      ? useCallback(
          async (id: string, input: TUpdateInput): Promise<TItem | null> => {
            const updateConfig = config.operations!.update!
            let updatedItem: TItem | null = null

            await mutate(
              async (currentData) => {
                const url = updateConfig.url(apiBaseUrl, input, id)
                const response = await authFetch(url, {
                  method: updateConfig.method,
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(input),
                })

                if (!response.ok) {
                  const errorData = await response.json().catch(() => ({}))
                  throw new Error(
                    errorData.error || `Failed to update ${config.name}`
                  )
                }

                const result = await response.json()
                updatedItem = updateConfig.transformResponse
                  ? updateConfig.transformResponse(result)
                  : result

                // Merge result into cache
                if (updateConfig.mergeResult) {
                  return updateConfig.mergeResult(
                    currentData,
                    updatedItem!,
                    input,
                    id
                  )
                }

                return currentData
              },
              {
                // PERFORMANCE: Function form avoids data dependency
                optimisticData: (currentData) =>
                  updateConfig.buildOptimisticData(currentData, input, id) as TData,
                rollbackOnError: true,
                revalidate: false,
              }
            )

            return updatedItem
          },
          [apiBaseUrl, authFetch, mutate]
        )
      : undefined
    // DELETE OPERATION

    const deleteOperation = config.operations?.delete
      ? useCallback(
          async (id: string): Promise<boolean> => {
            const deleteConfig = config.operations!.delete!

            try {
              await mutate(
                async (currentData) => {
                  const url = deleteConfig.url(apiBaseUrl, id, id)
                  const response = await authFetch(url, {
                    method: deleteConfig.method,
                  })

                  if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}))
                    throw new Error(
                      errorData.error || `Failed to delete ${config.name}`
                    )
                  }

                  // Merge result (usually just removes the item)
                  if (deleteConfig.mergeResult) {
                    return deleteConfig.mergeResult(currentData, undefined, id, id)
                  }

                  // Default: filter out deleted item for arrays
                  if (config.dataShape === 'array' && Array.isArray(currentData)) {
                    return currentData.filter(
                      (item: { id: string }) => item.id !== id
                    ) as TData
                  }

                  return currentData
                },
                {
                  // PERFORMANCE: Function form avoids data dependency
                  optimisticData: (currentData) =>
                    deleteConfig.buildOptimisticData(currentData, id, id) as TData,
                  rollbackOnError: true,
                  revalidate: false,
                }
              )
              return true
            } catch {
              return false
            }
          },
          [apiBaseUrl, authFetch, mutate]
        )
      : undefined
    // BULK OPERATIONS

    const bulkUpdate = config.bulkOperations?.bulkUpdate
      ? useCallback(
          async (ids: string[], updates: Partial<TItem>): Promise<boolean> => {
            const bulkConfig = config.bulkOperations!.bulkUpdate!

            try {
              await mutate(
                async (currentData) => {
                  const url = bulkConfig.url(apiBaseUrl)
                  const response = await authFetch(url, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ids, updates }),
                  })

                  if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}))
                    throw new Error(
                      errorData.error || `Failed to bulk update ${config.name}s`
                    )
                  }

                  // Return optimistic data as final (API confirms success)
                  return bulkConfig.buildOptimisticData(
                    currentData,
                    ids,
                    updates
                  ) as TData
                },
                {
                  // PERFORMANCE: Function form avoids data dependency
                  optimisticData: (currentData) =>
                    bulkConfig.buildOptimisticData(currentData, ids, updates) as TData,
                  rollbackOnError: true,
                  revalidate: false,
                }
              )
              return true
            } catch {
              return false
            }
          },
          [apiBaseUrl, authFetch, mutate]
        )
      : undefined

    const bulkDelete = config.bulkOperations?.bulkDelete
      ? useCallback(
          async (ids: string[]): Promise<boolean> => {
            const bulkConfig = config.bulkOperations!.bulkDelete!

            try {
              await mutate(
                async (currentData) => {
                  const url = bulkConfig.url(apiBaseUrl)
                  const response = await authFetch(url, {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ids }),
                  })

                  if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}))
                    throw new Error(
                      errorData.error || `Failed to bulk delete ${config.name}s`
                    )
                  }

                  return bulkConfig.buildOptimisticData(currentData, ids) as TData
                },
                {
                  // PERFORMANCE: Function form avoids data dependency
                  optimisticData: (currentData) =>
                    bulkConfig.buildOptimisticData(currentData, ids) as TData,
                  rollbackOnError: true,
                  revalidate: false,
                }
              )
              return true
            } catch {
              return false
            }
          },
          [apiBaseUrl, authFetch, mutate]
        )
      : undefined

    const reorder = config.bulkOperations?.reorder
      ? useCallback(
          async (orderedIds: string[]): Promise<boolean> => {
            const bulkConfig = config.bulkOperations!.reorder!

            try {
              await mutate(
                async (currentData) => {
                  const url = bulkConfig.url(apiBaseUrl)
                  const response = await authFetch(url, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ orderedIds }),
                  })

                  if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}))
                    throw new Error(
                      errorData.error || `Failed to reorder ${config.name}s`
                    )
                  }

                  return bulkConfig.buildOptimisticData(
                    currentData,
                    orderedIds
                  ) as TData
                },
                {
                  // PERFORMANCE: Function form avoids data dependency
                  optimisticData: (currentData) =>
                    bulkConfig.buildOptimisticData(currentData, orderedIds) as TData,
                  rollbackOnError: true,
                  revalidate: false,
                }
              )
              return true
            } catch {
              return false
            }
          },
          [apiBaseUrl, authFetch, mutate]
        )
      : undefined
    // INDEXES (for fast lookups)

    const indexes = useMemo(() => {
      if (!config.indexes || config.dataShape !== 'array') return {}
      if (!data || !Array.isArray(data)) return {}

      const result: Record<string, Record<string, TItem>> = {}
      const items = data as TItem[]

      for (const indexConfig of config.indexes) {
        const index: Record<string, TItem> = {}
        for (const item of items) {
          const key = indexConfig.keyExtractor(item)
          index[key] = item
        }
        result[indexConfig.name] = index
      }

      return result
    }, [data])
    // SELECTORS

    const selectors = useMemo(() => {
      if (!config.selectors) return {}

      const result: Record<string, (...args: unknown[]) => unknown> = {}
      for (const selectorConfig of config.selectors) {
        result[selectorConfig.name] = (...args: unknown[]) =>
          selectorConfig.select(data, ...args)
      }
      return result
    }, [data])
    // RETURN

    return {
      // Core SWR state
      data: data ?? config.defaultValue,
      isLoading,
      isValidating,
      error: config.errorTransformer
        ? error
          ? config.errorTransformer(error)
          : null
        : error?.message || null,

      // CRUD operations
      create,
      update,
      delete: deleteOperation,

      // Bulk operations
      bulkUpdate,
      bulkDelete,
      reorder,

      // Indexes and selectors
      ...indexes,
      ...selectors,

      // Utilities
      refetch: () => mutate(),
      mutate,
    } as CRUDHookReturn<TData, TItem, TCreateInput, TUpdateInput>
  }
}
