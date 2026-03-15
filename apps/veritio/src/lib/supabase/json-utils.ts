/**
 * Supabase Json Type Utilities
 *
 * Supabase's auto-generated types use a loose `Json` type for JSONB columns.
 * This forces developers to write `as unknown as Type[]` casts everywhere.
 *
 * These utilities provide type-safe casts with optional runtime validation,
 * replacing scattered `as unknown as` patterns with centralized, testable functions.
 *
 * @example
 * ```typescript
 * // Before: scattered casts
 * const ids = (data.success_frame_ids as unknown as string[]) || []
 *
 * // After: centralized utilities
 * const ids = castJsonArray<string>(data.success_frame_ids)
 * ```
 */

import type { Json } from './types'

// =============================================================================
// TYPE GUARDS
// =============================================================================

/**
 * Check if a value is a non-null object (not an array)
 */
export function isJsonObject(value: unknown): value is Record<string, Json> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Check if a value is an array of any Json values
 */
export function isJsonArray(value: unknown): value is Json[] {
  return Array.isArray(value)
}

/**
 * Check if a value is an array of strings
 */
export function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

/**
 * Check if a value is an array of numbers
 */
export function isNumberArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'number')
}

/**
 * Check if a value is an array of objects
 */
export function isObjectArray(value: unknown): value is Record<string, Json>[] {
  return Array.isArray(value) && value.every((item) => isJsonObject(item))
}

// =============================================================================
// CAST FUNCTIONS
// =============================================================================

/**
 * Cast a Json value to a specific type.
 * Returns the value cast to TResult, or the fallback if value is null/undefined.
 *
 * @param value - The Json value from Supabase
 * @param fallback - Value to return if input is null/undefined
 * @returns The value cast to TResult, or fallback
 *
 * @example
 * ```typescript
 * interface MyConfig { enabled: boolean; threshold: number }
 * const config = castJson<MyConfig>(row.config, { enabled: false, threshold: 0 })
 * ```
 */
export function castJson<TResult>(
  value: Json | null | undefined,
  fallback: TResult
): TResult {
  if (value === null || value === undefined) {
    return fallback
  }
  return value as unknown as TResult
}

/**
 * Cast a Json value to an array type.
 * Returns empty array if value is null/undefined/not-an-array.
 *
 * @param value - The Json value from Supabase
 * @param itemValidator - Optional function to validate each item
 * @returns The value cast to TItem[], or empty array
 *
 * @example
 * ```typescript
 * // Simple cast
 * const ids = castJsonArray<string>(row.frame_ids)
 *
 * // With validation (filters invalid items)
 * const ids = castJsonArray<string>(row.frame_ids, (item) => typeof item === 'string')
 * ```
 */
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

/**
 * Cast a Json value to a Record type.
 * Returns empty object if value is null/undefined/not-an-object.
 *
 * @param value - The Json value from Supabase
 * @returns The value cast to Record<string, TValue>, or empty object
 *
 * @example
 * ```typescript
 * const metadata = castJsonRecord<string>(row.metadata)
 * ```
 */
export function castJsonRecord<TValue>(
  value: Json | null | undefined
): Record<string, TValue> {
  if (!isJsonObject(value)) {
    return {}
  }
  return value as unknown as Record<string, TValue>
}

/**
 * Cast a Json value to a nullable type.
 * Returns null if value is null/undefined, otherwise returns the cast value.
 *
 * @param value - The Json value from Supabase
 * @returns The value cast to TResult, or null
 *
 * @example
 * ```typescript
 * const pathway = castJsonNullable<PathwayConfig>(row.success_pathway)
 * if (pathway) {
 *   // pathway is PathwayConfig
 * }
 * ```
 */
export function castJsonNullable<TResult>(
  value: Json | null | undefined
): TResult | null {
  if (value === null || value === undefined) {
    return null
  }
  return value as unknown as TResult
}

// =============================================================================
// TO JSON FUNCTIONS (for inserting/updating)
// =============================================================================

/**
 * Convert a typed value to Json for Supabase insert/update.
 * This is the reverse of castJson - used when writing to the database.
 *
 * @param value - The typed value to convert
 * @returns The value as Json type
 *
 * @example
 * ```typescript
 * const insert = {
 *   conditions: toJson(myConditions),
 *   config: toJson(myConfig),
 * }
 * ```
 */
export function toJson<T>(value: T): Json {
  return value as unknown as Json
}

/**
 * Convert a typed array to Json for Supabase insert/update.
 *
 * @param value - The typed array to convert, or null/undefined
 * @returns The value as Json type, or empty array
 */
export function toJsonArray<T>(value: T[] | null | undefined): Json {
  return (value || []) as unknown as Json
}

/**
 * Convert a typed value to Json for Supabase, or null if undefined.
 *
 * @param value - The typed value to convert, or null/undefined
 * @returns The value as Json type, or null
 */
export function toJsonNullable<T>(value: T | null | undefined): Json | null {
  if (value === null || value === undefined) {
    return null
  }
  return value as unknown as Json
}

// =============================================================================
// SPECIALIZED HELPERS
// =============================================================================

/**
 * Extract string array from Json, commonly used for ID arrays.
 * Filters out any non-string values for safety.
 *
 * @param value - The Json value from Supabase
 * @returns Array of strings
 *
 * @example
 * ```typescript
 * const frameIds = extractStringIds(row.success_frame_ids)
 * ```
 */
export function extractStringIds(value: Json | null | undefined): string[] {
  return castJsonArray(value, (item): item is string => typeof item === 'string')
}

/**
 * Safely merge Json objects with typed defaults.
 * Useful for settings/config fields that need defaults.
 *
 * @param value - The Json value from Supabase
 * @param defaults - Default values to merge with
 * @returns Merged object with all default keys guaranteed
 *
 * @example
 * ```typescript
 * const settings = mergeJsonWithDefaults(row.settings, {
 *   randomize: false,
 *   showProgress: true,
 * })
 * ```
 */
export function mergeJsonWithDefaults<T extends Record<string, unknown>>(
  value: Json | null | undefined,
  defaults: T
): T {
  if (!isJsonObject(value)) {
    return defaults
  }
  return { ...defaults, ...(value as unknown as Partial<T>) }
}
