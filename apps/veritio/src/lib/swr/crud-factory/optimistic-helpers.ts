/**
 * SWR CRUD Hook Factory - Optimistic Update Helpers
 *
 * Utility functions for building optimistic data during mutations.
 * These enable immediate UI updates before API responses arrive.
 */

// =============================================================================
// ARRAY OPERATIONS
// =============================================================================

/**
 * Safely convert currentData to an array
 * Handles cases where SWR returns non-array truthy values (e.g., {}, { data: [...] })
 */
function toSafeArray<TItem>(currentData: TItem[] | undefined): TItem[] {
  return Array.isArray(currentData) ? currentData : []
}

/**
 * Prepend a new item to the start of an array
 * Used for create operations where newest items appear first
 */
export function buildOptimisticPrepend<TItem extends { id: string }>(
  currentData: TItem[] | undefined,
  newItem: TItem
): TItem[] {
  return [newItem, ...toSafeArray(currentData)]
}

/**
 * Append a new item to the end of an array
 * Used for create operations where newest items appear last
 */
export function buildOptimisticAppend<TItem extends { id: string }>(
  currentData: TItem[] | undefined,
  newItem: TItem
): TItem[] {
  return [...toSafeArray(currentData), newItem]
}

/**
 * Update a single item in an array by ID
 * Used for update operations
 */
export function buildOptimisticMapUpdate<TItem extends { id: string }>(
  currentData: TItem[] | undefined,
  itemId: string,
  updates: Partial<TItem>
): TItem[] {
  return toSafeArray(currentData).map((item) =>
    item.id === itemId ? { ...item, ...updates } : item
  )
}

/**
 * Remove a single item from an array by ID
 * Used for delete operations
 */
export function buildOptimisticFilterDelete<TItem extends { id: string }>(
  currentData: TItem[] | undefined,
  itemId: string
): TItem[] {
  return toSafeArray(currentData).filter((item) => item.id !== itemId)
}

/**
 * Replace a temp item with the real item from API
 * Used after create to swap temp ID with real ID
 *
 * IMPORTANT: Preserves the position of the temp item instead of always prepending.
 * This ensures items don't "jump" when the API responds.
 *
 * Only replaces ONE temp item - if there are multiple (from rapid creates),
 * the others are kept for their respective API responses.
 */
export function replaceTemporaryItem<TItem extends { id: string }>(
  currentData: TItem[] | undefined,
  newItem: TItem,
  tempIdPrefix: string = 'temp-'
): TItem[] {
  const safeData = toSafeArray(currentData)

  // Find the index of the first temp item to preserve its position
  const tempIndex = safeData.findIndex((item) => item.id.startsWith(tempIdPrefix))

  if (tempIndex === -1) {
    // No temp item found - just append the new item
    return [...safeData, newItem]
  }

  // Replace ONLY the first temp item, keep all others (including other temp items)
  return safeData.map((item, index) =>
    index === tempIndex ? newItem : item
  )
}

// =============================================================================
// BULK OPERATIONS
// =============================================================================

/**
 * Update multiple items in an array by their IDs
 * Used for bulk update operations
 */
export function buildOptimisticBulkUpdate<TItem extends { id: string }>(
  currentData: TItem[] | undefined,
  itemIds: string[],
  updates: Partial<TItem>
): TItem[] {
  const idSet = new Set(itemIds)
  return toSafeArray(currentData).map((item) =>
    idSet.has(item.id) ? { ...item, ...updates } : item
  )
}

/**
 * Remove multiple items from an array by their IDs
 * Used for bulk delete operations
 */
export function buildOptimisticBulkDelete<TItem extends { id: string }>(
  currentData: TItem[] | undefined,
  itemIds: string[]
): TItem[] {
  const idSet = new Set(itemIds)
  return toSafeArray(currentData).filter((item) => !idSet.has(item.id))
}

/**
 * Reorder items in an array based on new ID order
 * Used for drag-and-drop reordering
 */
export function buildOptimisticReorder<
  TItem extends { id: string; position?: number }
>(currentData: TItem[] | undefined, orderedIds: string[]): TItem[] {
  const itemMap = new Map(toSafeArray(currentData).map((item) => [item.id, item]))

  return orderedIds
    .map((id, index) => {
      const item = itemMap.get(id)
      if (!item) return null
      // Update position if the item has a position field
      return 'position' in item ? { ...item, position: index } : item
    })
    .filter((item): item is TItem => item !== null)
}

// =============================================================================
// OBJECT OPERATIONS (for non-array data)
// =============================================================================

/**
 * Deep merge utility for nested object updates
 * Used for preferences and settings that have nested structure
 */
export function deepMerge<T extends Record<string, unknown>>(
  target: T,
  source: Partial<T>
): T {
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
      // Recursively merge nested objects
      result[key] = deepMerge(
        targetValue as Record<string, unknown>,
        sourceValue as Record<string, unknown>
      ) as T[Extract<keyof T, string>]
    } else {
      result[key] = sourceValue as T[Extract<keyof T, string>]
    }
  }

  return result
}

/**
 * Build optimistic data for deep merge updates
 * Used for object-shaped data like user preferences
 */
export function buildOptimisticDeepMerge<T extends Record<string, unknown>>(
  currentData: T | undefined,
  updates: Partial<T>
): T | undefined {
  if (!currentData) return undefined
  return deepMerge(currentData, updates)
}

// =============================================================================
// TEMPORARY ITEM CREATION
// =============================================================================

/**
 * Create a temporary item for optimistic create
 * Generates a temp ID and adds timestamps
 *
 * Note: This uses type assertion because we're creating a partial
 * representation of TItem for optimistic UI. The full item will
 * come from the API response.
 */
export function createTempItem<TItem extends { id: string }>(
  input: Partial<TItem>,
  defaults: Partial<TItem> = {}
): TItem {
  const tempItem = {
    id: `temp-${Date.now()}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...defaults,
    ...input,
  }
  // Type assertion needed because we're building an optimistic item
  // that may not have all required fields - it will be replaced
  // by the real API response
  return tempItem as unknown as TItem
}

/**
 * Check if an item ID is temporary
 */
export function isTempId(id: string, prefix: string = 'temp-'): boolean {
  return id.startsWith(prefix)
}

// =============================================================================
// MERGE HELPERS (for after API response)
// =============================================================================

/**
 * Merge API create result into array
 * Replaces temp item with real item from API
 */
export function mergeCreateResult<TItem extends { id: string }>(
  currentData: TItem[] | undefined,
  result: TItem,
  _input: unknown,
  _itemId?: string
): TItem[] {
  return replaceTemporaryItem(currentData, result)
}

/**
 * Merge API update result into array
 * Updates the matching item with API response
 */
export function mergeUpdateResult<TItem extends { id: string }>(
  currentData: TItem[] | undefined,
  result: TItem,
  _input: unknown,
  itemId?: string
): TItem[] {
  return toSafeArray(currentData).map((item) =>
    item.id === (itemId || result.id) ? result : item
  )
}

/**
 * Merge API delete result into array
 * Ensures item is removed (should already be gone from optimistic update)
 */
export function mergeDeleteResult<TItem extends { id: string }>(
  currentData: TItem[] | undefined,
  _result: void,
  _input: unknown,
  itemId?: string
): TItem[] {
  const safeData = toSafeArray(currentData)
  if (!itemId) return safeData
  return safeData.filter((item) => item.id !== itemId)
}
