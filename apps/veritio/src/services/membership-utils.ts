/**
 * Membership Utilities
 *
 * Shared helpers for resolving a user's organisation memberships.
 * Extracted from the identical query that was copy-pasted across
 * dashboard-service, study-service, and several other service files.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@veritio/study-types'

type SupabaseClientType = SupabaseClient<Database>

/**
 * Fetch all organisation IDs that a user is an active member of.
 *
 * Returns `{ data: string[], error: null }` on success, or
 * `{ data: null, error }` on failure.
 */
export async function getUserOrgIds(
  supabase: SupabaseClientType,
  userId: string
): Promise<{ data: string[] | null; error: Error | null }> {
  const { data: memberships, error } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', userId)
    .not('joined_at', 'is', null)

  if (error) {
    return { data: null, error: new Error(error.message) }
  }

  return {
    data: memberships?.map((m) => m.organization_id) ?? [],
    error: null,
  }
}

/**
 * Given a user's org IDs and an optional requested org ID,
 * return the scoped list.
 *
 * If `requestedOrgId` is provided and the user belongs to it,
 * scope to just that org. Otherwise scope to all user orgs.
 */
export function resolveOrgScope(
  userOrgIds: string[],
  requestedOrgId?: string
): string[] {
  if (requestedOrgId && userOrgIds.includes(requestedOrgId)) {
    return [requestedOrgId]
  }
  return userOrgIds
}
