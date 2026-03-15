

function toSafeArray<TItem>(currentData: TItem[] | undefined): TItem[] {
  return Array.isArray(currentData) ? currentData : []
}

export function buildOptimisticPrepend<TItem extends { id: string }>(
  currentData: TItem[] | undefined,
  newItem: TItem
): TItem[] {
  return [newItem, ...toSafeArray(currentData)]
}
export function buildOptimisticAppend<TItem extends { id: string }>(
  currentData: TItem[] | undefined,
  newItem: TItem
): TItem[] {
  return [...toSafeArray(currentData), newItem]
}

export function buildOptimisticMapUpdate<TItem extends { id: string }>(
  currentData: TItem[] | undefined,
  itemId: string,
  updates: Partial<TItem>
): TItem[] {
  return toSafeArray(currentData).map((item) =>
    item.id === itemId ? { ...item, ...updates } : item
  )
}
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
export function buildOptimisticBulkDelete<TItem extends { id: string }>(
  currentData: TItem[] | undefined,
  itemIds: string[]
): TItem[] {
  const idSet = new Set(itemIds)
  return toSafeArray(currentData).filter((item) => !idSet.has(item.id))
}
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

export function buildOptimisticDeepMerge<T extends Record<string, unknown>>(
  currentData: T | undefined,
  updates: Partial<T>
): T | undefined {
  if (!currentData) return undefined
  return deepMerge(currentData, updates)
}
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

export function isTempId(id: string, prefix: string = 'temp-'): boolean {
  return id.startsWith(prefix)
}
export function mergeCreateResult<TItem extends { id: string }>(
  currentData: TItem[] | undefined,
  result: TItem,
  _input: unknown,
  _itemId?: string
): TItem[] {
  return replaceTemporaryItem(currentData, result)
}
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
