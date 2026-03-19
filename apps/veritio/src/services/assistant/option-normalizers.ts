/**
 * Shared option normalization helpers for draft and builder write tools.
 *
 * These are the canonical implementations — imported by both create-tools.ts
 * and builder-write-normalizers.ts to avoid duplication.
 */

/**
 * Normalize option labels — convert bare strings and wrong field names to { label } objects.
 */
export function normalizeOptionLabels(config: Record<string, unknown>): Record<string, unknown> {
  const arrayFields = ['options', 'rows', 'columns', 'items', 'scales']
  let result = config

  for (const field of arrayFields) {
    const arr = result[field]
    if (!arr || !Array.isArray(arr)) continue

    let changed = false
    const normalized = arr.map((item: unknown) => {
      if (typeof item === 'string') {
        changed = true
        return { label: item }
      }

      if (typeof item !== 'object' || item === null) return item

      const obj = item as Record<string, unknown>
      if (typeof obj.label === 'string' && obj.label.trim()) return obj

      const altFields = ['text', 'value', 'name', 'title', 'content']
      for (const alt of altFields) {
        const v = obj[alt]
        if (typeof v === 'string' && v.trim()) {
          changed = true
          return { ...obj, label: v }
        }
      }

      return obj
    })

    if (changed) {
      result = { ...result, [field]: normalized }
    }
  }

  return result
}

/**
 * Ensure all array items have unique IDs.
 */
export function ensureOptionIds(config: Record<string, unknown>): Record<string, unknown> {
  const arrayFields = ['options', 'rows', 'columns', 'items', 'scales']
  let result = config

  for (const field of arrayFields) {
    const arr = result[field]
    if (!arr || !Array.isArray(arr)) continue

    const seenIds = new Set<string>()
    const fixed = (arr as Record<string, unknown>[]).map((item) => {
      const id = item.id as string | undefined
      if (!id || seenIds.has(id)) {
        return { ...item, id: crypto.randomUUID() }
      }
      seenIds.add(id)
      return item
    })

    if (fixed !== arr) {
      result = { ...result, [field]: fixed }
    }
  }

  return result
}
