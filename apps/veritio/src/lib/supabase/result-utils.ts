/**
 * Result Utilities
 *
 * Standardised helpers for building { data, error } result objects
 * returned by service functions. These eliminate scattered inline
 * error-construction logic across service files.
 */

/** Check whether a Supabase error represents "row not found" (PostgREST 116). */
export function isNotFound(err: { code?: string } | null): boolean {
  return err?.code === 'PGRST116'
}

/** Build a "not found" result for a given entity label. */
export function notFound(label: string): { data: null; error: Error } {
  return { data: null, error: new Error(`${label} not found`) }
}

/** Wrap a Supabase/Postgres error into a standard result. */
export function dbError(err: { message: string }): { data: null; error: Error } {
  return { data: null, error: new Error(err.message) }
}

/** Build a "permission denied" result. */
export function permissionDenied(msg: string): { data: null; error: Error } {
  return { data: null, error: new Error(msg) }
}

/** Convert a Supabase error to a standard result, detecting "not found" automatically. */
export function handleQueryError(
  err: { code?: string; message: string },
  notFoundLabel?: string
): { data: null; error: Error } {
  if (notFoundLabel && isNotFound(err)) {
    return notFound(notFoundLabel)
  }
  return dbError(err)
}
