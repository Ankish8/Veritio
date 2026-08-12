import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@veritio/study-types'

type SupabaseClientType = SupabaseClient<Database>

/**
 * Reading side of the in-app notification inbox.
 *
 * The `notifications` table has been written to since the app shipped, but
 * nothing ever read it — so a mention only reached someone by email, or by a
 * toast that required them to already be looking at that exact study. Being
 * mentioned in one study while working in another produced nothing at all.
 *
 * Everything here is scoped to the calling user's own id, which is the whole
 * authorization story: a notification is already a per-user record.
 */

const TABLE = 'notifications'

export interface NotificationRow {
  id: string
  user_id: string
  type: string
  title: string
  message: string
  category: string
  group_key: string | null
  study_id: string | null
  metadata: Record<string, unknown> | null
  read: boolean
  created_at: string
}

export interface NotificationListResult {
  notifications: NotificationRow[]
  /** Unread across ALL categories — the badge is not filter-dependent. */
  unreadCount: number
  /** Unread per category, so filter chips can carry their own counts. */
  unreadByCategory: Record<string, number>
  hasMore: boolean
}

export async function listNotifications(
  supabase: SupabaseClientType,
  userId: string,
  options?: {
    limit?: number
    unreadOnly?: boolean
    before?: string
    /** Restrict to one bucket — drives the inbox's filter chips. */
    category?: string
  }
): Promise<{ data: NotificationListResult | null; error: Error | null }> {
  const limit = Math.min(options?.limit ?? 20, 50)

  let query = (supabase as any)
    .from(TABLE)
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit + 1)

  if (options?.unreadOnly) query = query.eq('read', false)
  if (options?.before) query = query.lt('created_at', options.before)
  if (options?.category) query = query.eq('category', options.category)

  // The unread breakdown is fetched as rows rather than N count queries: at
  // inbox scale (bounded by the retention cron) one small select beats five
  // round-trips, and it yields the total for free.
  const [{ data, error }, { data: unreadRows }] = await Promise.all([
    query,
    (supabase as any)
      .from(TABLE)
      .select('category')
      .eq('user_id', userId)
      .eq('read', false),
  ])

  if (error) return { data: null, error: new Error(error.message) }

  const rows = (data ?? []) as NotificationRow[]
  const hasMore = rows.length > limit

  const unreadByCategory: Record<string, number> = {}
  for (const row of (unreadRows ?? []) as Array<{ category: string | null }>) {
    const key = row.category ?? 'system'
    unreadByCategory[key] = (unreadByCategory[key] ?? 0) + 1
  }

  return {
    data: {
      notifications: hasMore ? rows.slice(0, limit) : rows,
      unreadCount: (unreadRows ?? []).length,
      unreadByCategory,
      hasMore,
    },
    error: null,
  }
}

/**
 * Mark notifications read. Omitting `ids` marks everything read for the user,
 * which is what the "Mark all read" affordance needs.
 */
export async function markNotificationsRead(
  supabase: SupabaseClientType,
  userId: string,
  ids?: string[]
): Promise<{ data: { unreadCount: number } | null; error: Error | null }> {
  let update = (supabase as any)
    .from(TABLE)
    .update({ read: true })
    // Scoped to the caller — one user can never mark another's notifications.
    .eq('user_id', userId)
    .eq('read', false)

  if (ids?.length) update = update.in('id', ids)

  const { error } = await update
  if (error) return { data: null, error: new Error(error.message) }

  const { count } = await (supabase as any)
    .from(TABLE)
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('read', false)

  return { data: { unreadCount: count || 0 }, error: null }
}
