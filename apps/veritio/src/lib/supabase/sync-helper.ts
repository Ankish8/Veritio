import type { SupabaseClient } from '@supabase/supabase-js'
import type { PostgrestError } from '@supabase/postgrest-js'

/**
 * Delete records from a table that are NOT in the given `keepIds` list,
 * scoped by a single column (e.g. `study_id` or `prototype_id`).
 *
 * When `keepIds` is empty every record matching the scope is deleted.
 *
 * Uses Supabase/PostgREST `not('column', 'in', '(...)')` syntax to keep
 * the query URL short — the incoming set is typically small.
 */
export async function deleteStaleRecords(
  supabase: SupabaseClient,
  table: string,
  scopeColumn: string,
  scopeValue: string,
  keepColumn: string,
  keepIds: string[],
): Promise<{ error: PostgrestError | null }> {
  const query = (supabase.from(table as any) as any)
    .delete()
    .eq(scopeColumn, scopeValue)

  if (keepIds.length > 0) {
    const { error } = await query.not(keepColumn, 'in', `(${keepIds.join(',')})`)
    return { error }
  }

  const { error } = await query
  return { error }
}
