import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@veritio/study-types'
import { getStudyPermission } from './permission-service'

type SupabaseClientType = SupabaseClient<Database>

/**
 * `study_comment_reads` was added in 20260812010000_comments_v2.sql and is not
 * yet in the generated Database types, so reads/writes go through an untyped
 * client — the same convention the codebase already uses for other
 * post-generation tables (e.g. panel_study_participations). Drop these casts
 * when the types are next regenerated.
 */
const READS_TABLE = 'study_comment_reads'

export interface CommentReadState {
  lastReadAt: string | null
  unreadCount: number
}

/**
 * Per-user, per-study comment read state.
 *
 * Replaces a `useState(0)` counter that lived in one React tree: it reset on
 * every reload and navigation, so "3 unread" vanished the moment you refreshed,
 * and no unread indicator could ever appear outside the open study.
 *
 * Unread is derived from `last_read_at` rather than stored as a number, so it
 * stays correct no matter how many tabs or devices the user has open, and can
 * never drift from the comments actually present.
 */

/** Count comments in a study newer than `since`, excluding the user's own. */
async function countUnread(
  supabase: SupabaseClientType,
  studyId: string,
  userId: string,
  since: string | null
): Promise<number> {
  let query = supabase
    .from('study_comments')
    .select('*', { count: 'exact', head: true })
    .eq('study_id', studyId)
    .eq('is_deleted', false)
    // Your own comments are never unread to you.
    .neq('author_user_id', userId)

  if (since) query = query.gt('created_at', since)

  const { count } = await query
  return count || 0
}

export async function getCommentReadState(
  supabase: SupabaseClientType,
  studyId: string,
  userId: string
): Promise<{ data: CommentReadState | null; error: Error | null }> {
  const { data: permission, error: permError } = await getStudyPermission(supabase, studyId, userId)
  if (permError) return { data: null, error: permError }
  if (!permission) return { data: null, error: new Error('Access denied') }

  const { data: row } = await (supabase as any)
    .from(READS_TABLE)
    .select('last_read_at')
    .eq('study_id', studyId)
    .eq('user_id', userId)
    .maybeSingle()

  const lastReadAt = (row as { last_read_at: string } | null)?.last_read_at ?? null

  return {
    data: { lastReadAt, unreadCount: await countUnread(supabase, studyId, userId, lastReadAt) },
    error: null,
  }
}

/**
 * Mark a study's comments read up to `readAt` (defaults to now).
 *
 * Never moves the marker backwards: two tabs racing, or a stale request
 * arriving late, must not resurrect already-read comments as unread.
 */
export async function markCommentsRead(
  supabase: SupabaseClientType,
  studyId: string,
  userId: string,
  readAt?: string
): Promise<{ data: CommentReadState | null; error: Error | null }> {
  const { data: permission, error: permError } = await getStudyPermission(supabase, studyId, userId)
  if (permError) return { data: null, error: permError }
  if (!permission) return { data: null, error: new Error('Access denied') }

  const candidate = readAt ?? new Date().toISOString()

  const { data: existing } = await (supabase as any)
    .from(READS_TABLE)
    .select('last_read_at')
    .eq('study_id', studyId)
    .eq('user_id', userId)
    .maybeSingle()

  const previous = (existing as { last_read_at: string } | null)?.last_read_at ?? null
  const lastReadAt =
    previous && new Date(previous).getTime() >= new Date(candidate).getTime() ? previous : candidate

  const { error } = await (supabase as any)
    .from(READS_TABLE)
    .upsert(
      { study_id: studyId, user_id: userId, last_read_at: lastReadAt },
      { onConflict: 'study_id,user_id' }
    )

  if (error) return { data: null, error: new Error(error.message) }

  return {
    data: { lastReadAt, unreadCount: await countUnread(supabase, studyId, userId, lastReadAt) },
    error: null,
  }
}
