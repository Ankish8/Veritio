import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@veritio/study-types'
import {
  type StudyComment,
  type StudyCommentInsert,
  type StudyCommentWithAuthor,
  type CommentThread,
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

  const commentsWithAuthors: StudyCommentWithAuthor[] = sortedResults.map((comment: any) => ({
    ...(comment as StudyComment),
    author: userMap.get(comment.author_user_id) || {
      id: comment.author_user_id,
      name: null,
      email: '',
      image: null,
    },
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

export async function getCommentThreads(
  supabase: SupabaseClientType,
  studyId: string,
  userId: string
): Promise<{ data: CommentThread[] | null; error: Error | null }> {
  const { data: comments, error } = await listStudyComments(supabase, studyId, userId)

  if (error) {
    return { data: null, error }
  }

  if (!comments) {
    return { data: [], error: null }
  }

  const rootComments = comments.filter((c) => !c.parent_comment_id)
  const repliesMap = new Map<string, StudyCommentWithAuthor[]>()

  for (const comment of comments) {
    if (comment.parent_comment_id) {
      const replies = repliesMap.get(comment.parent_comment_id) || []
      replies.push(comment)
      repliesMap.set(comment.parent_comment_id, replies)
    }
  }

  const threads: CommentThread[] = rootComments.map((root) => {
    const replies = (repliesMap.get(root.id) || []).sort(
      (a, b) => a.thread_position - b.thread_position
    )
    return {
      root,
      replies,
      reply_count: replies.length,
    }
  })

  threads.sort((a, b) => {
    const aLatest = a.replies.length > 0
      ? new Date(a.replies[a.replies.length - 1].created_at).getTime()
      : new Date(a.root.created_at).getTime()
    const bLatest = b.replies.length > 0
      ? new Date(b.replies[b.replies.length - 1].created_at).getTime()
      : new Date(b.root.created_at).getTime()
    return bLatest - aLatest // Newest first
  })

  return { data: threads, error: null }
}

export async function getComment(
  supabase: SupabaseClientType,
  commentId: string,
  userId: string
): Promise<{ data: StudyCommentWithAuthor | null; error: Error | null }> {
  const { data: comment, error: commentError } = await supabase
    .from('study_comments')
    .select('*')
    .eq('id', commentId)
    .single()

  if (commentError) {
    if (commentError.code === 'PGRST116') {
      return { data: null, error: new Error('Comment not found') }
    }
    return { data: null, error: new Error(commentError.message) }
  }

  const { data: permission, error: permError } = await getStudyPermission(
    supabase,
    comment.study_id,
    userId
  )

  if (permError) {
    return { data: null, error: permError }
  }

  if (!permission) {
    return { data: null, error: new Error('Access denied') }
  }

  try {
    await assertStudyFeature(supabase, comment.study_id, 'collaboration')
  } catch (e) {
    return { data: null, error: e instanceof Error ? e : new Error('Team collaboration required') }
  }

  const [{ data: author }, preferenceMap] = await Promise.all([
    supabase.from('user').select('id, name, email, image').eq('id', comment.author_user_id).single(),
    fetchDisplayNamePreferences(supabase, [comment.author_user_id]),
  ])

  const commentWithAuthor: StudyCommentWithAuthor = {
    ...(comment as StudyComment),
    author: author
      ? {
          id: author.id,
          name: formatDisplayName({ name: author.name, email: author.email }, preferenceMap.get(author.id), ''),
          email: author.email,
          image: author.image,
        }
      : {
          id: comment.author_user_id,
          name: null,
          email: '',
          image: null,
        },
  }

  return { data: commentWithAuthor, error: null }
}

export async function getCommentsMentioningUser(
  supabase: SupabaseClientType,
  userId: string,
  options?: {
    limit?: number
    offset?: number
    unreadOnly?: boolean
  }
): Promise<{ data: StudyCommentWithAuthor[] | null; error: Error | null }> {
  let query = supabase
    .from('study_comments')
    .select('*')
    .contains('mentions', [userId])
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })

  if (options?.limit) {
    query = query.limit(options.limit)
  }

  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 20) - 1)
  }

  const { data: comments, error } = await query

  if (error) {
    return { data: null, error: new Error(error.message) }
  }

  const authorIds = [...new Set((comments || []).map((c: { author_user_id: string }) => c.author_user_id))]
  const userMap = new Map<string, UserInfo>()

  if (authorIds.length > 0) {
    const [{ data: users }, preferenceMap] = await Promise.all([
      supabase.from('user').select('id, name, email, image').in('id', authorIds as string[]),
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

   
  const commentsWithAuthors: StudyCommentWithAuthor[] = (comments || []).map((comment: any) => ({
    ...(comment as StudyComment),
    author: userMap.get(comment.author_user_id) || {
      id: comment.author_user_id,
      name: null,
      email: '',
      image: null,
    },
  }))

  return { data: commentsWithAuthors, error: null }
}

export async function getStudyCommentCount(
  supabase: SupabaseClientType,
  studyId: string
): Promise<{ count: number; error: Error | null }> {
  const { count, error } = await supabase
    .from('study_comments')
    .select('*', { count: 'exact', head: true })
    .eq('study_id', studyId)
    .eq('is_deleted', false)

  if (error) {
    return { count: 0, error: new Error(error.message) }
  }

  return { count: count || 0, error: null }
}
