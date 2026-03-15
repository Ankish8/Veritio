import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@veritio/study-types'

type SupabaseClientType = SupabaseClient<Database>

export interface RecordingComment {
  id: string
  recording_id: string
  clip_id: string | null
  timestamp_ms: number | null
  content: string
  created_by: string
  author_name: string | null
  author_email: string | null
  author_image: string | null
  deleted_at: string | null
  created_at: string
  updated_at: string
}

export interface RecordingCommentInsert {
  recording_id: string
  clip_id?: string | null
  timestamp_ms?: number | null
  content: string
  created_by: string
}

/** Enrich comments with author name/email from the user table */
async function enrichWithAuthorInfo(
  supabase: SupabaseClientType,
  comments: any[]
): Promise<RecordingComment[]> {
  if (comments.length === 0) return []

  const userIds = [...new Set(comments.map(c => c.created_by).filter(id => !id.startsWith('guest:')))]

  const userMap = new Map<string, { name: string | null; email: string | null; image: string | null }>()
  if (userIds.length > 0) {
    const { data: users } = await supabase
      .from('user')
      .select('id, name, email, image')
      .in('id', userIds)

    if (users) {
      for (const u of users as any[]) {
        userMap.set(u.id, { name: u.name, email: u.email, image: u.image })
      }
    }
  }

  return comments.map(c => {
    const user = userMap.get(c.created_by)
    const isGuest = c.created_by?.startsWith('guest:')
    return {
      ...c,
      author_name: isGuest ? c.created_by.replace('guest:', '') : (user?.name ?? null),
      author_email: isGuest ? null : (user?.email ?? null),
      author_image: isGuest ? null : (user?.image ?? null),
    } as RecordingComment
  })
}

export async function listCommentsByRecording(
  supabase: SupabaseClientType,
  recordingId: string
): Promise<{ data: RecordingComment[] | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('recording_comments')
    .select('*')
    .eq('recording_id', recordingId)
    .is('deleted_at', null)
    .order('timestamp_ms', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true })

  if (error) {
    return { data: null, error: new Error(error.message) }
  }

  const enriched = await enrichWithAuthorInfo(supabase, data || [])
  return { data: enriched, error: null }
}

export async function listCommentsByClip(
  supabase: SupabaseClientType,
  clipId: string
): Promise<{ data: RecordingComment[] | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('recording_comments')
    .select('*')
    .eq('clip_id', clipId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })

  if (error) {
    return { data: null, error: new Error(error.message) }
  }

  const enriched = await enrichWithAuthorInfo(supabase, data || [])
  return { data: enriched, error: null }
}

export async function listTimestampedComments(
  supabase: SupabaseClientType,
  recordingId: string
): Promise<{ data: RecordingComment[] | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('recording_comments')
    .select('*')
    .eq('recording_id', recordingId)
    .not('timestamp_ms', 'is', null)
    .is('deleted_at', null)
    .order('timestamp_ms', { ascending: true })

  if (error) {
    return { data: null, error: new Error(error.message) }
  }

  const enriched = await enrichWithAuthorInfo(supabase, data || [])
  return { data: enriched, error: null }
}

export async function listGeneralNotes(
  supabase: SupabaseClientType,
  recordingId: string
): Promise<{ data: RecordingComment[] | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('recording_comments')
    .select('*')
    .eq('recording_id', recordingId)
    .is('timestamp_ms', null)
    .is('clip_id', null)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) {
    return { data: null, error: new Error(error.message) }
  }

  const enriched = await enrichWithAuthorInfo(supabase, data || [])
  return { data: enriched, error: null }
}

export async function createComment(
  supabase: SupabaseClientType,
  data: {
    recordingId: string
    content: string
    userId: string
    timestampMs?: number | null
    clipId?: string | null
  }
): Promise<{ data: RecordingComment | null; error: Error | null }> {
  const insert: RecordingCommentInsert = {
    recording_id: data.recordingId,
    content: data.content,
    created_by: data.userId,
    timestamp_ms: data.timestampMs ?? null,
    clip_id: data.clipId ?? null,
  }

  const { data: comment, error } = await supabase
    .from('recording_comments')
    .insert(insert as any)
    .select()
    .single()

  if (error) {
    return { data: null, error: new Error(error.message) }
  }

  const [enriched] = await enrichWithAuthorInfo(supabase, [comment])
  return { data: enriched, error: null }
}

export async function updateComment(
  supabase: SupabaseClientType,
  commentId: string,
  userId: string,
  content: string
): Promise<{ data: RecordingComment | null; error: Error | null }> {
  const { data: existingComment, error: fetchError } = await supabase
    .from('recording_comments')
    .select('created_by')
    .eq('id', commentId)
    .is('deleted_at', null)
    .single()

  if (fetchError) {
    return { data: null, error: new Error('Comment not found') }
  }

  if ((existingComment as any).created_by !== userId) {
    return { data: null, error: new Error('Not authorized to update this comment') }
  }

  const { data: comment, error } = await supabase
    .from('recording_comments')
    .update({
      content,
      updated_at: new Date().toISOString(),
    } as any)
    .eq('id', commentId)
    .select()
    .single()

  if (error) {
    return { data: null, error: new Error(error.message) }
  }

  const [enriched] = await enrichWithAuthorInfo(supabase, [comment])
  return { data: enriched, error: null }
}

export async function deleteComment(
  supabase: SupabaseClientType,
  commentId: string,
  userId: string
): Promise<{ success: boolean; error: Error | null }> {
  const { data: existingComment, error: fetchError } = await supabase
    .from('recording_comments')
    .select('created_by')
    .eq('id', commentId)
    .is('deleted_at', null)
    .single()

  if (fetchError) {
    return { success: false, error: new Error('Comment not found') }
  }

  if ((existingComment as any).created_by !== userId) {
    return { success: false, error: new Error('Not authorized to delete this comment') }
  }

  const { error } = await supabase
    .from('recording_comments')
    .update({
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as any)
    .eq('id', commentId)

  if (error) {
    return { success: false, error: new Error(error.message) }
  }

  return { success: true, error: null }
}

export async function createCommentViaShare(
  supabase: SupabaseClientType,
  data: {
    shareCode: string
    content: string
    guestName: string
    timestampMs?: number | null
  }
): Promise<{ data: RecordingComment | null; error: Error | null }> {
  const { data: share, error: shareError } = await supabase
    .from('recording_shares')
    .select('recording_id, access_level, revoked_at, expires_at')
    .eq('share_code', data.shareCode)
    .single()

  if (shareError || !share) {
    return { data: null, error: new Error('Invalid share link') }
  }

  const shareData = share as any

  if (shareData.revoked_at) {
    return { data: null, error: new Error('Share link has been revoked') }
  }

  if (shareData.expires_at && new Date(shareData.expires_at) < new Date()) {
    return { data: null, error: new Error('Share link has expired') }
  }

  if (shareData.access_level !== 'comment') {
    return { data: null, error: new Error('This share link does not allow comments') }
  }

  const insert: RecordingCommentInsert = {
    recording_id: shareData.recording_id,
    content: data.content,
    created_by: `guest:${data.guestName}`,
    timestamp_ms: data.timestampMs ?? null,
  }

  const { data: comment, error } = await supabase
    .from('recording_comments')
    .insert(insert as any)
    .select()
    .single()

  if (error) {
    return { data: null, error: new Error(error.message) }
  }

  return { data: comment as RecordingComment, error: null }
}
