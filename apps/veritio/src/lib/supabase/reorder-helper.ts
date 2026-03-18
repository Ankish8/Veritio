import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Batch-update the `position` column for a list of rows in a single table.
 *
 * Accepts either:
 *   - An ordered array of IDs (index becomes position), or
 *   - An array of `{ id, position }` pairs for pre-computed positions.
 *
 * Every update is scoped to `scopeColumn = scopeValue` so that RLS and
 * multi-tenant isolation are respected.
 */
export async function reorderItems(
  supabase: SupabaseClient,
  table: string,
  items: string[] | Array<{ id: string; position: number }>,
  scopeColumn: string,
  scopeValue: string,
): Promise<{ error: Error | null }> {
  if (items.length === 0) {
    return { error: null }
  }

  const pairs: Array<{ id: string; position: number }> =
    typeof items[0] === 'string'
      ? (items as string[]).map((id, index) => ({ id, position: index }))
      : (items as Array<{ id: string; position: number }>)

  const results = await Promise.all(
    pairs.map(({ id, position }) =>
      supabase
        .from(table)
        .update({ position })
        .eq('id', id)
        .eq(scopeColumn, scopeValue),
    ),
  )

  const failed = results.find((r) => r.error)
  if (failed?.error) {
    return { error: new Error(failed.error.message) }
  }

  return { error: null }
}
