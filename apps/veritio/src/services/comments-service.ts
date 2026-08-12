import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@veritio/study-types'
import {
  type StudyComment,
  type StudyCommentInsert,
  type StudyCommentWithAuthor,
  type UserInfo,
  hasRequiredRole,
} from '../lib/supabase/collaboration-types'
import { getStudyPermission } from './permission-service'
import { assertStudyFeature } from './entitlements-service'
import { formatDisplayName } from '../lib/user/display-name'
import { fetchDisplayNamePreferences } from '../lib/user/display-name-preferences.server'
import { extractMentionIds } from '../lib/comments/mention-format'

type SupabaseClientType = SupabaseClient<Database>

/** Resolve a study's organization via its project. */
async function getStudyOrganizationId(
  supabase: SupabaseClientType,
  studyId: string
): Promise<string | null> {
  const { data } = await supabase
    .from('studies')
    .select('project_id, projects(organization_id)')
    .eq('id', studyId)
    .single()

  const project = (data as { projects?: { organization_id?: string | null } | null } | null)?.projects
  return project?.organization_id ?? null
}

/**
 * Parse the @mentions out of a comment body and keep only those naming a real
 * member of the study's organization.
 *
 * The validation is the point: `content` is attacker-controlled, and these ids
 * become notification targets. Without the membership check a crafted body
 * could address notifications at any user id in the system.
 */
export async function resolveMentionedUserIds(
  supabase: SupabaseClientType,
  organizationId: string | null,
  content: string
): Promise<string[]> {
  const candidateIds = extractMentionIds(content)
  if (candidateIds.length === 0 || !organizationId) return []

  const { data, error } = await supabase
    .from('organization_members')
    .select('user_id')
    .eq('organization_id', organizationId)
    .in('user_id', candidateIds)

  if (error) return []

  return [...new Set((data ?? []).map((m: { user_id: string }) => m.user_id))]
}

export async function createStudyComment(
  supabase: SupabaseClientType,
  studyId: string,
  userId: string,
  input: {
    content: string
    parentCommentId?: string | null
  }
): Promise<{ data: StudyComment | null; error: Error | null }> {
  const { data: permission, error: permError } = await getStudyPermission(supabase, studyId, userId)

  if (permError) {
    return { data: null, error: permError }
  }

  // Viewer, not editor: someone who can read a study should be able to leave
  // feedback on it. Requiring `editor` showed viewers a composer that always
  // failed. The read gate above is what actually protects the discussion.
  if (!permission || !hasRequiredRole(permission.role, 'viewer')) {
    return { data: null, error: new Error('Permission denied: you do not have access to this study') }
  }

  try {
    await assertStudyFeature(supabase, studyId, 'collaboration')
  } catch (e) {
    return { data: null, error: e instanceof Error ? e : new Error('Team collaboration required') }
  }

  const organizationId =
    permission.organizationId ?? (await getStudyOrganizationId(supabase, studyId))
  const mentions = await resolveMentionedUserIds(supabase, organizationId, input.content)

  let threadPosition = 0
  if (input.parentCommentId) {
    const { count } = await supabase
      .from('study_comments')
      .select('*', { count: 'exact', head: true })
      .eq('parent_comment_id', input.parentCommentId)
      .eq('is_deleted', false)

    threadPosition = (count || 0) + 1
  }

  const insertData: StudyCommentInsert = {
    study_id: studyId,
    author_user_id: userId,
    content: input.content.trim(),
    parent_comment_id: input.parentCommentId || null,
    thread_position: threadPosition,
    mentions,
  }

  const { data: comment, error } = await supabase
    .from('study_comments')
    .insert(insertData)
    .select()
    .single()

  if (error) {
    return { data: null, error: new Error(error.message) }
  }

  return { data: comment as StudyComment, error: null }
}

export async function updateComment(
  supabase: SupabaseClientType,
  commentId: string,
  userId: string,
  content: string
): Promise<{ data: StudyComment | null; error: Error | null }> {
  const { data: existing, error: fetchError } = await supabase
    .from('study_comments')
    .select('study_id, author_user_id, is_deleted')
    .eq('id', commentId)
    .single()

  if (fetchError) {
    if (fetchError.code === 'PGRST116') {
      return { data: null, error: new Error('Comment not found') }
    }
    return { data: null, error: new Error(fetchError.message) }
  }

  if (existing.is_deleted) {
    return { data: null, error: new Error('Cannot edit deleted comment') }
  }

  try {
    await assertStudyFeature(supabase, existing.study_id, 'collaboration')
  } catch (e) {
    return { data: null, error: e instanceof Error ? e : new Error('Team collaboration required') }
  }

  if (existing.author_user_id !== userId) {
    return { data: null, error: new Error('Permission denied: only author can edit comment') }
  }

  const organizationId = await getStudyOrganizationId(supabase, existing.study_id)
  const mentions = await resolveMentionedUserIds(supabase, organizationId, content)

  const { data: comment, error } = await supabase
    .from('study_comments')
    .update({
      content: content.trim(),
      mentions,
      edited_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', commentId)
    .select()
    .single()

  if (error) {
    return { data: null, error: new Error(error.message) }
  }

  return { data: comment as StudyComment, error: null }
}

export async function deleteComment(
  supabase: SupabaseClientType,
  commentId: string,
  userId: string
): Promise<{ success: boolean; error: Error | null }> {
  const { data: existing, error: fetchError } = await supabase
    .from('study_comments')
    .select('study_id, author_user_id, is_deleted')
    .eq('id', commentId)
    .single()

  if (fetchError) {
    if (fetchError.code === 'PGRST116') {
      return { success: false, error: new Error('Comment not found') }
    }
    return { success: false, error: new Error(fetchError.message) }
  }

  if (existing.is_deleted) {
    return { success: false, error: new Error('Comment already deleted') }
  }

  try {
    await assertStudyFeature(supabase, existing.study_id, 'collaboration')
  } catch (e) {
    return { success: false, error: e instanceof Error ? e : new Error('Team collaboration required') }
  }

  const isAuthor = existing.author_user_id === userId

  if (!isAuthor) {
    const { data: permission } = await getStudyPermission(supabase, existing.study_id, userId)
    if (!permission || !hasRequiredRole(permission.role, 'admin')) {
      return { success: false, error: new Error('Permission denied: only author or admin can delete') }
    }
  }

  const { error } = await supabase
    .from('study_comments')
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      deleted_by_user_id: userId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', commentId)

  if (error) {
    return { success: false, error: new Error(error.message) }
  }

  return { success: true, error: null }
}

/** Emoji the UI offers. Constrained so the column stays queryable and the
 *  picker needs no emoji-picker dependency. */
export const ALLOWED_REACTIONS = ['👍', '✅', '👀', '🎉', '❤️', '🤔'] as const
export type AllowedReaction = (typeof ALLOWED_REACTIONS)[number]

/**
 * Resolve or reopen a thread.
 *
 * Anyone with access to the study can resolve, not just the comment's author:
 * the person who answers a question is usually not the person who asked it, and
 * requiring the author to come back and close their own thread is how "resolved"
 * ends up unused. Resolution is reversible and attributed, so this is safe.
 */
export async function setCommentResolved(
  supabase: SupabaseClientType,
  commentId: string,
  userId: string,
  resolved: boolean
): Promise<{ data: StudyComment | null; error: Error | null }> {
  const { data: existing, error: fetchError } = await supabase
    .from('study_comments')
    .select('study_id, is_deleted, parent_comment_id')
    .eq('id', commentId)
    .single()

  if (fetchError) {
    return {
      data: null,
      error: new Error(fetchError.code === 'PGRST116' ? 'Comment not found' : fetchError.message),
    }
  }
  if (existing.is_deleted) {
    return { data: null, error: new Error('Cannot resolve a deleted comment') }
  }
  // Resolution is a property of a thread, so it belongs on the root comment.
  if (existing.parent_comment_id) {
    return { data: null, error: new Error('Resolve the thread root, not a reply') }
  }

  const { data: permission, error: permError } = await getStudyPermission(
    supabase,
    existing.study_id,
    userId
  )
  if (permError) return { data: null, error: permError }
  if (!permission || !hasRequiredRole(permission.role, 'viewer')) {
    return { data: null, error: new Error('Permission denied: you do not have access to this study') }
  }

  try {
    await assertStudyFeature(supabase, existing.study_id, 'collaboration')
  } catch (e) {
    return { data: null, error: e instanceof Error ? e : new Error('Team collaboration required') }
  }

  const { data: comment, error } = await (supabase as any)
    .from('study_comments')
    .update({
      resolved_at: resolved ? new Date().toISOString() : null,
      resolved_by_user_id: resolved ? userId : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', commentId)
    .select()
    .single()

  if (error) return { data: null, error: new Error(error.message) }
  return { data: comment as StudyComment, error: null }
}

/**
 * Add or remove one emoji reaction for the calling user.
 *
 * Idempotent per (comment, user, emoji): reacting twice removes the reaction,
 * which is what the unique constraint in the schema encodes.
 */
export async function toggleCommentReaction(
  supabase: SupabaseClientType,
  commentId: string,
  userId: string,
  emoji: string
): Promise<{ data: { reacted: boolean } | null; error: Error | null }> {
  if (!(ALLOWED_REACTIONS as readonly string[]).includes(emoji)) {
    return { data: null, error: new Error('Unsupported reaction') }
  }

  const { data: existing, error: fetchError } = await supabase
    .from('study_comments')
    .select('study_id, is_deleted')
    .eq('id', commentId)
    .single()

  if (fetchError) {
    return {
      data: null,
      error: new Error(fetchError.code === 'PGRST116' ? 'Comment not found' : fetchError.message),
    }
  }
  if (existing.is_deleted) {
    return { data: null, error: new Error('Cannot react to a deleted comment') }
  }

  const { data: permission, error: permError } = await getStudyPermission(
    supabase,
    existing.study_id,
    userId
  )
  if (permError) return { data: null, error: permError }
  if (!permission || !hasRequiredRole(permission.role, 'viewer')) {
    return { data: null, error: new Error('Permission denied: you do not have access to this study') }
  }

  const { data: current } = await (supabase as any)
    .from('study_comment_reactions')
    .select('id')
    .eq('comment_id', commentId)
    .eq('user_id', userId)
    .eq('emoji', emoji)
    .maybeSingle()

  if (current) {
    const { error } = await (supabase as any)
      .from('study_comment_reactions')
      .delete()
      .eq('id', (current as { id: string }).id)
    if (error) return { data: null, error: new Error(error.message) }
    return { data: { reacted: false }, error: null }
  }

  const { error } = await (supabase as any)
    .from('study_comment_reactions')
    .insert({ comment_id: commentId, user_id: userId, emoji })

  if (error) return { data: null, error: new Error(error.message) }
  return { data: { reacted: true }, error: null }
}

/** Reaction tallies for a set of comments, keyed by comment id. */
export interface ReactionSummary {
  emoji: string
  count: number
  userIds: string[]
}

async function fetchReactions(
  supabase: SupabaseClientType,
  commentIds: string[]
): Promise<Map<string, ReactionSummary[]>> {
  const byComment = new Map<string, ReactionSummary[]>()
  if (commentIds.length === 0) return byComment

  const { data } = await (supabase as any)
    .from('study_comment_reactions')
    .select('comment_id, user_id, emoji')
    .in('comment_id', commentIds)

  for (const row of (data ?? []) as Array<{ comment_id: string; user_id: string; emoji: string }>) {
    const list = byComment.get(row.comment_id) ?? []
    const found = list.find((r) => r.emoji === row.emoji)
    if (found) {
      found.count += 1
      found.userIds.push(row.user_id)
    } else {
      list.push({ emoji: row.emoji, count: 1, userIds: [row.user_id] })
    }
    byComment.set(row.comment_id, list)
  }

  return byComment
}

export interface CommentPaginationOptions {
  limit?: number
  before?: string
  after?: string
}

export interface PaginatedCommentsResponse {
  comments: StudyCommentWithAuthor[]
  nextCursor: string | null
  prevCursor: string | null
  hasMore: boolean
  totalCount: number
}

export async function listStudyComments(
  supabase: SupabaseClientType,
  studyId: string,
  userId: string,
  options?: CommentPaginationOptions
): Promise<{ data: StudyCommentWithAuthor[] | null; error: Error | null; pagination?: PaginatedCommentsResponse }> {
  const limit = options?.limit ?? 50
  const before = options?.before
  const after = options?.after

  let query = supabase
    .from('study_comments')
    .select('*')
    .eq('study_id', studyId)
    .eq('is_deleted', false)

  if (before) {
    query = query.lt('created_at', before).order('created_at', { ascending: false })
  } else if (after) {
    query = query.gt('created_at', after).order('created_at', { ascending: true })
  } else {
    query = query.order('created_at', { ascending: false })
  }
  query = query.limit(limit + 1)

  const permResult = await getStudyPermission(supabase, studyId, userId)

  if (permResult.error) {
    return { data: null, error: permResult.error }
  }
  if (!permResult.data) {
    return { data: null, error: new Error('Access denied') }
  }

  try {
    await assertStudyFeature(supabase, studyId, 'collaboration')
  } catch (e) {
    return { data: null, error: e instanceof Error ? e : new Error('Team collaboration required') }
  }

  // Note: No PostgREST JOIN on user table — there's no FK from
  // study_comments.author_user_id to user.id. Instead, fetch comments and
  // authors separately.
  const commentsResult = await query
  const { data: comments, error: commentError } = commentsResult

  if (commentError) {
    return { data: null, error: new Error(commentError.message) }
  }

  // Counted on every page, not just cursor pages: the panel renders
  // `totalCount - comments.length` as the "N more" affordance, so skipping the
  // count on page 1 rendered a negative number.
  const { count } = await supabase
    .from('study_comments')
    .select('*', { count: 'exact', head: true })
    .eq('study_id', studyId)
    .eq('is_deleted', false)
  const totalCount = count || 0

  const hasMore = (comments || []).length > limit
  const results = hasMore ? (comments || []).slice(0, limit) : comments || []
  const sortedResults = before || !after ? [...results].reverse() : results

  // Fetch author info separately
  const authorIds = [
    ...new Set(sortedResults.map((c: { author_user_id: string }) => c.author_user_id)),
  ]

  const userMap = new Map<string, UserInfo>()
  if (authorIds.length > 0) {
    const [{ data: users }, preferenceMap] = await Promise.all([
      supabase.from('user').select('id, name, email, image').in('id', authorIds as string[]),
      // Format each author's name per their "Display name format" preference.
      fetchDisplayNamePreferences(supabase, authorIds as string[]),
    ])

    for (const user of users || []) {
      userMap.set(user.id, {
        id: user.id,
        name: formatDisplayName({ name: user.name, email: user.email }, preferenceMap.get(user.id), ''),
        email: user.email,
        image: user.image,
      })
    }
  }

  const reactionMap = await fetchReactions(
    supabase,
    sortedResults.map((c: { id: string }) => c.id)
  )

  const commentsWithAuthors: StudyCommentWithAuthor[] = sortedResults.map((comment: any) => ({
    ...(comment as StudyComment),
    author: userMap.get(comment.author_user_id) || {
      id: comment.author_user_id,
      name: null,
      email: '',
      image: null,
    },
    reactions: reactionMap.get(comment.id) ?? [],
  }))

  const oldestComment = sortedResults[0]
  const newestComment = sortedResults[sortedResults.length - 1]

  const pagination: PaginatedCommentsResponse = {
    comments: commentsWithAuthors,
    nextCursor: hasMore && oldestComment ? oldestComment.created_at : null,
    prevCursor: newestComment ? newestComment.created_at : null,
    hasMore,
    totalCount: totalCount || 0,
  }

  return { data: commentsWithAuthors, error: null, pagination }
}
