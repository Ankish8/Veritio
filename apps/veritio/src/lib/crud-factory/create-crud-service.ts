import { cache } from '../cache/memory-cache'
import type {
  SupabaseClientType,
  EntityConfig,
  CrudService,
  ListResult,
  EntityResult,
  DeleteResult,
} from './types'

/**
 * Strip join data (e.g., 'studies' from ownership verification) from results
 */
function stripJoinData<T>(rows: unknown[], joinKey: string = 'studies'): T[] {
  return rows.map((row) => {
    if (typeof row !== 'object' || row === null) return row as T
    const { [joinKey]: _join, ...data } = row as Record<string, unknown>
    return data as T
  })
}

/**
 * Check if an error matches any of the configured error handlers
 */
function handleCustomError(
  error: { message: string; code?: string },
  handlers: Array<{ pattern: string | RegExp; message: string }>
): Error | null {
  for (const handler of handlers) {
    const matches =
      typeof handler.pattern === 'string'
        ? error.message.includes(handler.pattern)
        : handler.pattern.test(error.message)
    if (matches) {
      return new Error(handler.message)
    }
  }
  return null
}

/**
 * Creates a complete CRUD service for an entity based on configuration.
 *
 * This factory generates standardized CRUD operations with:
 * - Memory caching with configurable TTL
 * - Ownership verification via study join
 * - Consistent error handling
 * - Bulk operations with deletion detection
 *
 * @example
 * ```typescript
 * const cardService = createCrudService(cardConfig)
 * const { data, error } = await cardService.list(supabase, studyId)
 * ```
 */
export function createCrudService<TRow, TInput, TBulkItem>(
  config: EntityConfig<TRow, TInput, TBulkItem>
): CrudService<TRow, TInput, TBulkItem> {
  const {
    tableName,
    entityName,
    cache: cacheConfig,
    selects,
    orderBy,
    fieldTransformers,
    errorHandlers = [],
    upsertStrategy,
    buildInsertData,
    buildUpsertData,
    transformListResult,
  } = config

  /**
   * Invalidate cache for a study
   */
  function invalidateCache(studyId: string): void {
    cache.delete(cacheConfig.keyGenerator(studyId))

    // Invalidate additional patterns if configured
    if (cacheConfig.invalidatePatterns) {
      for (const pattern of cacheConfig.invalidatePatterns) {
        cache.deletePattern(pattern)
      }
    }
  }

  /**
   * List all entities for a study with optional ownership verification
   */
  async function list(
    supabase: SupabaseClientType,
    studyId: string,
    userId?: string
  ): Promise<ListResult<TRow>> {
    // Check cache first
    const cacheKey = cacheConfig.keyGenerator(studyId)
    const cached = cache.get<TRow[]>(cacheKey)
    if (cached) {
      return { data: cached, error: null }
    }

    // Build query with optional ownership join
    let query = supabase
      .from(tableName)
      .select(userId ? selects.listWithOwnership : selects.list)
      .eq('study_id', studyId)
      .order(orderBy.column, { ascending: orderBy.ascending })

    // If userId provided, verify ownership via join
    if (userId) {
      query = query.eq('studies.user_id', userId)
    }

    const { data: rows, error } = await query

    if (error) {
      return { data: null, error: new Error(error.message) }
    }

    // Strip join data if ownership verification was used
    let cleanRows: TRow[]
    if (userId) {
      cleanRows = stripJoinData<TRow>(rows || [])
    } else {
      cleanRows = (rows || []) as TRow[]
    }

    // Apply custom transformation if provided
    if (transformListResult) {
      cleanRows = transformListResult(cleanRows as unknown[])
    }

    // Cache the result
    cache.set(cacheKey, cleanRows, cacheConfig.ttl)

    return { data: cleanRows, error: null }
  }

  /**
   * Get a single entity by ID
   */
  async function get(
    supabase: SupabaseClientType,
    id: string,
    studyId: string
  ): Promise<EntityResult<TRow>> {
    const { data: row, error } = await supabase
      .from(tableName)
      .select(selects.get)
      .eq('id', id)
      .eq('study_id', studyId)
      .single()

    if (error) {
      // Handle not found error
      if (error.code === 'PGRST116') {
        return { data: null, error: new Error(`${entityName} not found`) }
      }
      return { data: null, error: new Error(error.message) }
    }

    return { data: row as TRow, error: null }
  }

  /**
   * Create a new entity
   */
  async function create(
    supabase: SupabaseClientType,
    studyId: string,
    input: TInput
  ): Promise<EntityResult<TRow>> {
    // Build insert data using config function
    let insertData = buildInsertData(studyId, input)

    // Apply field transformer if provided
    if (fieldTransformers?.create) {
      insertData = fieldTransformers.create(input, studyId)
    }

     
    const { data: row, error } = await (supabase
      .from(tableName)
      .insert(insertData as any)
      .select(selects.create)
      .single())

    if (error) {
      // Check custom error handlers
      const customError = handleCustomError(error, errorHandlers)
      if (customError) {
        return { data: null, error: customError }
      }
      return { data: null, error: new Error(error.message) }
    }

    // Invalidate cache
    invalidateCache(studyId)

    return { data: row as TRow, error: null }
  }

  /**
   * Update an existing entity
   */
  async function update(
    supabase: SupabaseClientType,
    id: string,
    studyId: string,
    input: Partial<TInput>
  ): Promise<EntityResult<TRow>> {
    // Build updates from input
    let updates: Record<string, unknown> = {}

    if (fieldTransformers?.update) {
      updates = fieldTransformers.update(input)
    } else {
      // Default: pass through all defined fields
      for (const [key, value] of Object.entries(input)) {
        if (value !== undefined) {
          updates[key] = value
        }
      }
    }

     
    const { data: row, error } = await (supabase
      .from(tableName)
      .update(updates as any)
      .eq('id', id)
      .eq('study_id', studyId)
      .select(selects.update)
      .single())

    if (error) {
      // Handle not found error
      if (error.code === 'PGRST116') {
        return { data: null, error: new Error(`${entityName} not found`) }
      }
      // Check custom error handlers
      const customError = handleCustomError(error, errorHandlers)
      if (customError) {
        return { data: null, error: customError }
      }
      return { data: null, error: new Error(error.message) }
    }

    // Invalidate cache
    invalidateCache(studyId)

    return { data: row as TRow, error: null }
  }

  /**
   * Delete an entity
   */
  async function del(
    supabase: SupabaseClientType,
    id: string,
    studyId: string
  ): Promise<DeleteResult> {
    const { error } = await supabase
      .from(tableName)
      .delete()
      .eq('id', id)
      .eq('study_id', studyId)

    if (error) {
      return { success: false, error: new Error(error.message) }
    }

    // Invalidate cache
    invalidateCache(studyId)

    return { success: true, error: null }
  }

  /**
   * Bulk update entities (create, update, delete in sync)
   */
  async function bulkUpdate(
    supabase: SupabaseClientType,
    studyId: string,
    items: TBulkItem[]
  ): Promise<ListResult<TRow>> {
    // Get existing IDs to detect deletions
    const { data: existingRows } = await supabase
      .from(tableName)
      .select('id')
      .eq('study_id', studyId)

    const existingIds = new Set((existingRows || []).map((r) => (r as { id: string }).id))
    const incomingIds = new Set(items.map((item) => (item as { id: string }).id))

    // Find items to delete (exist in DB but not in incoming array)
    const idsToDelete = Array.from(existingIds).filter((id) => !incomingIds.has(id))

    // Delete removed items
    if (idsToDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from(tableName)
        .delete()
        .eq('study_id', studyId)
        .in('id', idsToDelete)

      if (deleteError) {
        return {
          data: null,
          error: new Error(`Failed to delete ${entityName.toLowerCase()}s: ${deleteError.message}`),
        }
      }
    }

    // Handle empty items array (all deleted)
    if (items.length === 0) {
      invalidateCache(studyId)
      return { data: [], error: null }
    }

    // Build upsert data for all items
    const upsertData = items.map((item) => {
      let data = buildUpsertData(studyId, item)

      // Apply field transformer if provided
      if (fieldTransformers?.bulkItem) {
        data = fieldTransformers.bulkItem(item, studyId)
      }

      return data
    })

    // Execute upsert based on strategy
    if (upsertStrategy === 'parallel') {
      // Parallel strategy: individual upserts with Promise.all
       
      const upserts = upsertData.map((data) =>
        supabase.from(tableName).upsert(data as any).eq('study_id', studyId)
      )

      try {
        await Promise.all(upserts)
      } catch (err) {
        return {
          data: null,
          error: err instanceof Error ? err : new Error(`Failed to update ${entityName.toLowerCase()}s`),
        }
      }
    } else {
      // Batch strategy: single upsert call
       
      const { error: upsertError } = await supabase
        .from(tableName)
        .upsert(upsertData as any, { onConflict: 'id' })

      if (upsertError) {
        return {
          data: null,
          error: new Error(`Failed to save ${entityName.toLowerCase()}s: ${upsertError.message}`),
        }
      }
    }

    // Fetch updated items
    const { data: updatedRows, error } = await supabase
      .from(tableName)
      .select(selects.bulkUpdate)
      .eq('study_id', studyId)
      .order(orderBy.column, { ascending: orderBy.ascending })

    if (error) {
      return { data: null, error: new Error(error.message) }
    }

    // Apply custom transformation if provided
    let result = (updatedRows || []) as TRow[]
    if (transformListResult) {
      result = transformListResult(result as unknown[])
    }

    // Invalidate cache
    invalidateCache(studyId)

    return { data: result, error: null }
  }

  return {
    list,
    get,
    create,
    update,
    delete: del,
    bulkUpdate,
    invalidateCache,
  }
}
