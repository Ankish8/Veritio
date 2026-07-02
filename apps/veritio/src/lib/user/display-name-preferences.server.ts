import type { SupabaseClient } from '@supabase/supabase-js'
import type { DisplayNamePreference } from '../supabase/user-preferences-types'

/**
 * Fetch each user's Display name format preference, keyed by user id.
 *
 * Server-side companion to {@link formatDisplayName}: lets API steps and
 * services format OTHER users' names (comment authors, org members, etc.) the
 * way each of those users chose to appear.
 *
 * Reading another user's row in `user_preferences` requires the service-role
 * client (the table is service-role-only under RLS). Callers already using
 * `getMotiaSupabaseClient()` satisfy this. If the read is blocked or empty,
 * the returned map simply omits those users and callers fall back to
 * `full_name`, so this degrades gracefully rather than throwing.
 */
export async function fetchDisplayNamePreferences(
  supabase: SupabaseClient<any>,
  userIds: Array<string | null | undefined>
): Promise<Map<string, DisplayNamePreference>> {
  const map = new Map<string, DisplayNamePreference>()
  const ids = [...new Set(userIds.filter((id): id is string => !!id))]
  if (ids.length === 0) return map

  const { data } = await supabase
    .from('user_preferences')
    .select('user_id, display_name_preference')
    .in('user_id', ids)

  const rows = (data ?? []) as Array<{
    user_id: string
    display_name_preference: DisplayNamePreference | null
  }>
  for (const row of rows) {
    if (row.display_name_preference) {
      map.set(row.user_id, row.display_name_preference)
    }
  }
  return map
}
