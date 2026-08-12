import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@veritio/study-types'
import { formatDisplayName } from '../lib/user/display-name'
import { fetchDisplayNamePreferences } from '../lib/user/display-name-preferences.server'
import { stripMentionMarkup } from '../lib/comments/mention-format'

type SupabaseClientType = SupabaseClient<Database>

/**
 * Works out who should hear about a new comment, and how.
 *
 * Nothing notified anyone before this: `comment-created` was enqueued with no
 * subscriber, `COLLABORATION_EVENTS` declared `comment.mentioned` that was
 * never emitted, and the `mentions` column it would have keyed off was empty
 * because of a regex mismatch. A mention that reaches nobody is the failure
 * mode that makes a comment feature feel abandoned.
 */

/** How long after emailing someone about a study to stay quiet about it. */
const EMAIL_QUIET_PERIOD_MS = 5 * 60 * 1000

export const COMMENT_MENTION_NOTIFICATION_TYPE = 'comment-mention'
export const COMMENT_REPLY_NOTIFICATION_TYPE = 'comment-reply'

export interface CommentNotificationTarget {
  userId: string
  reason: 'mention' | 'reply'
  /** Whether to also send email, after preference and quiet-period checks. */
  email: boolean
}

export interface CommentNotificationContext {
  commentId: string
  studyId: string
  studyTitle: string
  projectId: string | null
  authorUserId: string
  authorName: string
  /** Comment body with mention markup flattened to plain @Name text. */
  preview: string
}

/** Trim a comment body to something that reads well in an email or toast. */
export function buildPreview(content: string, maxLength = 180): string {
  const plain = stripMentionMarkup(content).replace(/\s+/g, ' ').trim()
  return plain.length > maxLength ? `${plain.slice(0, maxLength - 1)}…` : plain
}

/**
 * Load the context a notification needs: study title, project, author name.
 * Returns null when the comment or study has gone away.
 */
export async function loadCommentNotificationContext(
  supabase: SupabaseClientType,
  commentId: string
): Promise<CommentNotificationContext | null> {
  const { data: comment } = await supabase
    .from('study_comments')
    .select('id, study_id, author_user_id, content, is_deleted')
    .eq('id', commentId)
    .maybeSingle()

  if (!comment || comment.is_deleted) return null

  const [{ data: study }, { data: author }, preferenceMap] = await Promise.all([
    supabase.from('studies').select('id, title, project_id').eq('id', comment.study_id).maybeSingle(),
    supabase.from('user').select('id, name, email').eq('id', comment.author_user_id).maybeSingle(),
    fetchDisplayNamePreferences(supabase, [comment.author_user_id]),
  ])

  if (!study) return null

  return {
    commentId: comment.id,
    studyId: comment.study_id,
    studyTitle: study.title || 'Untitled study',
    projectId: study.project_id ?? null,
    authorUserId: comment.author_user_id,
    authorName: author
      ? formatDisplayName(
          { name: author.name, email: author.email },
          preferenceMap.get(author.id),
          'A teammate'
        )
      : 'A teammate',
    preview: buildPreview(comment.content),
  }
}

/**
 * Everyone already in a thread, so a reply doesn't only reach people who were
 * explicitly @'d. Root comment author plus every replier.
 */
async function getThreadParticipants(
  supabase: SupabaseClientType,
  commentId: string,
  parentCommentId: string | null
): Promise<string[]> {
  if (!parentCommentId) return []

  const { data: rootComment } = await supabase
    .from('study_comments')
    .select('author_user_id')
    .eq('id', parentCommentId)
    .maybeSingle()

  const { data: replies } = await supabase
    .from('study_comments')
    .select('author_user_id')
    .eq('parent_comment_id', parentCommentId)
    .eq('is_deleted', false)
    .neq('id', commentId)

  const ids = [
    ...(rootComment ? [rootComment.author_user_id] : []),
    ...((replies ?? []) as Array<{ author_user_id: string }>).map((r) => r.author_user_id),
  ]
  return [...new Set(ids)]
}

/** Users who opted out of mention emails. In-app notifications are unaffected. */
async function getEmailOptOuts(
  supabase: SupabaseClientType,
  userIds: string[]
): Promise<Set<string>> {
  if (userIds.length === 0) return new Set()

  const { data } = await (supabase as any)
    .from('user_preferences')
    .select('user_id, comment_mention_emails')
    .in('user_id', userIds)

  const optedOut = new Set<string>()
  for (const row of (data ?? []) as Array<{ user_id: string; comment_mention_emails: boolean | null }>) {
    if (row.comment_mention_emails === false) optedOut.add(row.user_id)
  }
  return optedOut
}

/**
 * Users already emailed about this study recently.
 *
 * A burst of mentions in one discussion should not mean a burst of separate
 * emails. Rather than run a scheduler to batch them, the first email wins and
 * the rest are suppressed for a short window — the recipient still sees every
 * mention when they follow the link, and the in-app notification is always
 * recorded regardless.
 */
async function getRecentlyEmailed(
  supabase: SupabaseClientType,
  studyId: string,
  userIds: string[]
): Promise<Set<string>> {
  if (userIds.length === 0) return new Set()

  const since = new Date(Date.now() - EMAIL_QUIET_PERIOD_MS).toISOString()
  const { data } = await (supabase as any)
    .from('notifications')
    .select('user_id')
    .eq('study_id', studyId)
    .in('user_id', userIds)
    .in('type', [COMMENT_MENTION_NOTIFICATION_TYPE, COMMENT_REPLY_NOTIFICATION_TYPE])
    .gt('created_at', since)

  return new Set(((data ?? []) as Array<{ user_id: string }>).map((r) => r.user_id))
}

/**
 * Resolve the full recipient list for a new comment.
 *
 * Mentions outrank thread participation, so someone both @'d and in the thread
 * is notified once, as a mention. The author is never notified of their own
 * comment.
 */
export async function resolveCommentNotificationTargets(
  supabase: SupabaseClientType,
  params: {
    commentId: string
    studyId: string
    authorUserId: string
    mentions: string[]
    parentCommentId: string | null
  }
): Promise<CommentNotificationTarget[]> {
  const mentioned = new Set(params.mentions.filter((id) => id && id !== params.authorUserId))

  const threadParticipants = (
    await getThreadParticipants(supabase, params.commentId, params.parentCommentId)
  ).filter((id) => id !== params.authorUserId && !mentioned.has(id))

  const allIds = [...mentioned, ...threadParticipants]
  if (allIds.length === 0) return []

  const [optedOut, recentlyEmailed] = await Promise.all([
    getEmailOptOuts(supabase, allIds),
    getRecentlyEmailed(supabase, params.studyId, allIds),
  ])

  const canEmail = (id: string) => !optedOut.has(id) && !recentlyEmailed.has(id)

  return [
    ...[...mentioned].map((userId) => ({
      userId,
      reason: 'mention' as const,
      email: canEmail(userId),
    })),
    ...threadParticipants.map((userId) => ({
      userId,
      reason: 'reply' as const,
      email: canEmail(userId),
    })),
  ]
}
