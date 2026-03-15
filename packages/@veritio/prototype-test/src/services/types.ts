/**
 * Service result wrapper type.
 * Mirrors the type from apps/veritio/src/services/results/types.ts
 */
export interface ServiceResult<T> {
  data: T | null
  error: Error | null
}
