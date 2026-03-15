import type { SWRConfiguration, KeyedMutator } from 'swr'

export type FetcherType = 'global' | 'globalUnwrap' | 'public' | 'custom'

export type DataShape = 'array' | 'object'

export interface MutationConfig<TData, TInput, TResult = unknown> {
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  url: (baseUrl: string, input: TInput, itemId?: string) => string
  buildOptimisticData: (
    currentData: TData | undefined,
    input: TInput,
    itemId?: string
  ) => TData | undefined
  mergeResult?: (
    currentData: TData | undefined,
    result: TResult,
    input: TInput,
    itemId?: string
  ) => TData
  transformResponse?: (response: unknown) => TResult
}

export interface BulkOperationConfig<TData, TItem> {
  type: 'update' | 'delete' | 'reorder'
  url: (baseUrl: string) => string
  buildOptimisticData: (
    currentData: TData | undefined,
    itemIds: string[],
    updates?: Partial<TItem>
  ) => TData | undefined
}

export interface SelectorConfig<TData, TSelected> {
  name: string
  select: (data: TData | undefined, ...args: unknown[]) => TSelected
}

export interface IndexConfig<TItem> {
  name: string
  keyExtractor: (item: TItem) => string
}

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
  name: string
  dataShape: DataShape

  key: {
    base: string | ((params: Record<string, unknown>) => string | null)
  }

  fetcher: {
    type: FetcherType
    custom?: <T>(url: string) => Promise<T>
  }

  apiBaseUrl: string | ((params: Record<string, unknown>) => string)
  swrOptions?: Partial<SWRConfiguration>
  defaultValue: TData

  operations?: {
    create?: MutationConfig<TData, TCreateInput, TItem>
    update?: MutationConfig<TData, TUpdateInput, TItem>
    delete?: MutationConfig<TData, string, void>
  }

  bulkOperations?: {
    bulkUpdate?: BulkOperationConfig<TData, TItem>
    bulkDelete?: BulkOperationConfig<TData, TItem>
    reorder?: BulkOperationConfig<TData, TItem>
  }

  indexes?: IndexConfig<TItem>[]
  selectors?: SelectorConfig<TData, unknown>[]
  errorTransformer?: (error: Error) => string
}

export interface CRUDHookReturnBase<TData> {
  data: TData
  isLoading: boolean
  isValidating: boolean
  error: string | null
  refetch: () => void
  mutate: KeyedMutator<TData>
}

export interface CRUDOperations<TItem, TCreateInput, TUpdateInput> {
  create?: (input: TCreateInput) => Promise<TItem | null>
  update?: (id: string, input: TUpdateInput) => Promise<TItem | null>
  delete?: (id: string) => Promise<boolean>
}

export interface BulkOperations<TItem> {
  bulkUpdate?: (ids: string[], updates: Partial<TItem>) => Promise<boolean>
  bulkDelete?: (ids: string[]) => Promise<boolean>
  reorder?: (orderedIds: string[]) => Promise<boolean>
}

export type CRUDHookReturn<
  TData,
  TItem extends { id: string },
  TCreateInput,
  TUpdateInput
> = CRUDHookReturnBase<TData> &
  CRUDOperations<TItem, TCreateInput, TUpdateInput> &
  BulkOperations<TItem> & {
    [key: string]: unknown
  }

export interface CRUDHookOptions<TData> {
  initialData?: TData
  skip?: boolean
}
