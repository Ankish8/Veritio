import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@veritio/study-types'
import type { NotificationCategory } from '../lib/events/notify'

type SupabaseClientType = SupabaseClient<Database>

/**
 * Per-user, per-category notification channel preferences.
 *
 * Replaces three hard-coded type arrays in send-notification.step.ts
 * (`CLOSURE_NOTIFICATION_TYPES`, `COMMENT_EMAIL_TYPES`, `DIRECT_EMAIL_TYPES`)
 * which decided who got email by string matching, with no way for a user to
 * influence it.
 *
 * Absence means default-on: a row is written only when someone changes
 * something, so the table stays small and a brand-new user needs no seeding.
 */

const TABLE = 'user_notification_preferences'

export const NOTIFICATION_CATEGORIES: NotificationCategory[] = [
  'mention',
  'study',
  'job',
  'system',
  'billing',
]

export interface ChannelPreference {
  inApp: boolean
  email: boolean
}

export type PreferenceMap = Record<NotificationCategory, ChannelPreference>

/** Everything on — the shape a user gets before touching any setting. */
export function defaultPreferences(): PreferenceMap {
  return Object.fromEntries(
    NOTIFICATION_CATEGORIES.map((c) => [c, { inApp: true, email: true }])
  ) as PreferenceMap
}

export async function getPreferences(
  supabase: SupabaseClientType,
  userId: string
): Promise<PreferenceMap> {
  const prefs = defaultPreferences()

  const { data } = await (supabase as any)
    .from(TABLE)
    .select('category, in_app, email')
    .eq('user_id', userId)

  for (const row of (data ?? []) as Array<{
    category: NotificationCategory
    in_app: boolean
    email: boolean
  }>) {
    if (prefs[row.category]) {
      prefs[row.category] = { inApp: row.in_app, email: row.email }
    }
  }

  return prefs
}

/**
 * Resolve one category's channels.
 *
 * Fails OPEN: if the lookup errors, the user still gets the notification.
 * Silently swallowing someone's mention because a preferences query failed is
 * worse than showing one they might have muted.
 */
export async function resolveChannels(
  supabase: SupabaseClientType,
  userId: string,
  category: NotificationCategory
): Promise<ChannelPreference> {
  try {
    const { data } = await (supabase as any)
      .from(TABLE)
      .select('in_app, email')
      .eq('user_id', userId)
      .eq('category', category)
      .maybeSingle()

    if (!data) return { inApp: true, email: true }
    return { inApp: (data as any).in_app !== false, email: (data as any).email !== false }
  } catch {
    return { inApp: true, email: true }
  }
}

export async function updatePreferences(
  supabase: SupabaseClientType,
  userId: string,
  updates: Array<{ category: NotificationCategory; inApp?: boolean; email?: boolean }>
): Promise<{ data: PreferenceMap | null; error: Error | null }> {
  if (updates.length === 0) {
    return { data: await getPreferences(supabase, userId), error: null }
  }

  const current = await getPreferences(supabase, userId)

  const rows = updates
    .filter((u) => NOTIFICATION_CATEGORIES.includes(u.category))
    .map((u) => ({
      user_id: userId,
      category: u.category,
      in_app: u.inApp ?? current[u.category].inApp,
      email: u.email ?? current[u.category].email,
      updated_at: new Date().toISOString(),
    }))

  if (rows.length === 0) {
    return { data: current, error: null }
  }

  const { error } = await (supabase as any)
    .from(TABLE)
    .upsert(rows, { onConflict: 'user_id,category' })

  if (error) return { data: null, error: new Error(error.message) }

  return { data: await getPreferences(supabase, userId), error: null }
}
