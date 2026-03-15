import type { Json } from './types'

export function isJsonObject(value: unknown): value is Record<string, Json> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function isJsonArray(value: unknown): value is Json[] {
  return Array.isArray(value)
}

export function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

export function isNumberArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'number')
}

export function isObjectArray(value: unknown): value is Record<string, Json>[] {
  return Array.isArray(value) && value.every((item) => isJsonObject(item))
}
export function castJson<TResult>(
  value: Json | null | undefined,
  fallback: TResult
): TResult {
  if (value === null || value === undefined) {
    return fallback
  }
  return value as unknown as TResult
}
export function castJsonArray<TItem>(
  value: Json | null | undefined,
  itemValidator?: (item: unknown) => item is TItem
): TItem[] {
  if (!Array.isArray(value)) {
    return []
  }

  if (itemValidator) {
    return (value as unknown[]).filter(itemValidator)
  }

  return value as unknown as TItem[]
}
export function castJsonRecord<TValue>(
  value: Json | null | undefined
): Record<string, TValue> {
  if (!isJsonObject(value)) {
    return {}
  }
  return value as unknown as Record<string, TValue>
}
export function castJsonNullable<TResult>(
  value: Json | null | undefined
): TResult | null {
  if (value === null || value === undefined) {
    return null
  }
  return value as unknown as TResult
}
export function toJson<T>(value: T): Json {
  return value as unknown as Json
}
export function toJsonArray<T>(value: T[] | null | undefined): Json {
  return (value || []) as unknown as Json
}
export function toJsonNullable<T>(value: T | null | undefined): Json | null {
  if (value === null || value === undefined) {
    return null
  }
  return value as unknown as Json
}
export function extractStringIds(value: Json | null | undefined): string[] {
  return castJsonArray(value, (item): item is string => typeof item === 'string')
}
export function mergeJsonWithDefaults<T extends Record<string, unknown>>(
  value: Json | null | undefined,
  defaults: T
): T {
  if (!isJsonObject(value)) {
    return defaults
  }
  return { ...defaults, ...(value as unknown as Partial<T>) }
}
