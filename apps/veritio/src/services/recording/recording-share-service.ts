import type { SupabaseClient } from '@supabase/supabase-js'
import { nanoid } from 'nanoid'
import bcrypt from 'bcryptjs'
import type { Database } from '@veritio/study-types'

type SupabaseClientType = SupabaseClient<Database>

const SHARE_CODE_LENGTH = 16
const PASSWORD_SALT_ROUNDS = 10
const DEFAULT_EXPIRY_DAYS = 30

export interface RecordingShare {
  id: string
  recording_id: string
  share_code: string
  access_level: 'view' | 'comment'
  password_hash: string | null
  expires_at: string | null
  view_count: number
  last_viewed_at: string | null
  created_by: string
  revoked_at: string | null
  created_at: string
  updated_at: string
}

export interface RecordingShareInsert {
  recording_id: string
  share_code: string
  access_level: 'view' | 'comment'
  password_hash?: string | null
  expires_at?: string | null
  created_by: string
}

export async function listSharesByRecording(
  supabase: SupabaseClientType,
  recordingId: string
): Promise<{ data: RecordingShare[] | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('recording_shares')
    .select('*')
    .eq('recording_id', recordingId)
    .is('revoked_at', null)
    .order('created_at', { ascending: false })

  if (error) {
    return { data: null, error: new Error(error.message) }
  }

  return { data: (data as RecordingShare[]) || [], error: null }
}

export async function getShareByCode(
  supabase: SupabaseClientType,
  shareCode: string
): Promise<{ data: RecordingShare | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('recording_shares')
    .select('*')
    .eq('share_code', shareCode)
    .is('revoked_at', null)
    .single()

  if (error) {
    return { data: null, error: new Error('Share link not found') }
  }

  const share = data as RecordingShare

  if (share.expires_at && new Date(share.expires_at) < new Date()) {
    return { data: null, error: new Error('Share link has expired') }
  }

  return { data: share, error: null }
}

export async function createShare(
  supabase: SupabaseClientType,
  data: {
    recordingId: string
    userId: string
    password?: string | null
    expiresInDays?: number | null
    accessLevel?: 'view' | 'comment'
  }
): Promise<{ data: RecordingShare | null; error: Error | null }> {
  const shareCode = nanoid(SHARE_CODE_LENGTH)

  let passwordHash: string | null = null
  if (data.password) {
    passwordHash = await bcrypt.hash(data.password, PASSWORD_SALT_ROUNDS)
  }

  let expiresAt: string | null = null
  const expiresInDays = data.expiresInDays ?? DEFAULT_EXPIRY_DAYS
  if (expiresInDays !== null) {
    const expireDate = new Date()
    expireDate.setDate(expireDate.getDate() + expiresInDays)
    expiresAt = expireDate.toISOString()
  }

  const insert: RecordingShareInsert = {
    recording_id: data.recordingId,
    share_code: shareCode,
    access_level: data.accessLevel || 'view',
    password_hash: passwordHash,
    expires_at: expiresAt,
    created_by: data.userId,
  }

  const { data: share, error } = await supabase
    .from('recording_shares')
    .insert(insert as any)
    .select()
    .single()

  if (error) {
    return { data: null, error: new Error(error.message) }
  }

  return { data: share as RecordingShare, error: null }
}

export async function verifySharePassword(
  supabase: SupabaseClientType,
  shareCode: string,
  password: string
): Promise<{ valid: boolean; error: Error | null }> {
  const { data: share, error } = await getShareByCode(supabase, shareCode)

  if (error || !share) {
    return { valid: false, error: error || new Error('Share not found') }
  }

  if (!share.password_hash) {
    return { valid: true, error: null }
  }

  const isValid = await bcrypt.compare(password, share.password_hash)
  if (!isValid) {
    return { valid: false, error: new Error('Invalid password') }
  }

  return { valid: true, error: null }
}

export async function recordShareView(
  supabase: SupabaseClientType,
  shareCode: string
): Promise<{ data: RecordingShare | null; error: Error | null }> {
  const { data, error } = await supabase
    .rpc('increment_share_view_count', { p_share_code: shareCode })

  if (error) {
    return { data: null, error: new Error(error.message) }
  }

  return { data: data as RecordingShare, error: null }
}

export async function revokeShare(
  supabase: SupabaseClientType,
  shareId: string,
  userId: string
): Promise<{ success: boolean; error: Error | null }> {
  const { data: existingShare, error: fetchError } = await supabase
    .from('recording_shares')
    .select('created_by')
    .eq('id', shareId)
    .is('revoked_at', null)
    .single()

  if (fetchError) {
    return { success: false, error: new Error('Share not found') }
  }

  if ((existingShare as any).created_by !== userId) {
    return { success: false, error: new Error('Not authorized to revoke this share') }
  }

  const { error } = await supabase
    .from('recording_shares')
    .update({
      revoked_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as any)
    .eq('id', shareId)

  if (error) {
    return { success: false, error: new Error(error.message) }
  }

  return { success: true, error: null }
}

export async function updateShare(
  supabase: SupabaseClientType,
  shareId: string,
  userId: string,
  updates: {
    accessLevel?: 'view' | 'comment'
    password?: string | null
    expiresInDays?: number | null
  }
): Promise<{ data: RecordingShare | null; error: Error | null }> {
  const { data: existingShare, error: fetchError } = await supabase
    .from('recording_shares')
    .select('created_by')
    .eq('id', shareId)
    .is('revoked_at', null)
    .single()

  if (fetchError) {
    return { data: null, error: new Error('Share not found') }
  }

  if ((existingShare as any).created_by !== userId) {
    return { data: null, error: new Error('Not authorized to update this share') }
  }

  const updateData: any = {
    updated_at: new Date().toISOString(),
  }

  if (updates.accessLevel !== undefined) {
    updateData.access_level = updates.accessLevel
  }

  if (updates.password !== undefined) {
    if (updates.password === null) {
      updateData.password_hash = null
    } else {
      updateData.password_hash = await bcrypt.hash(updates.password, PASSWORD_SALT_ROUNDS)
    }
  }

  if (updates.expiresInDays !== undefined) {
    if (updates.expiresInDays === null) {
      updateData.expires_at = null
    } else {
      const expireDate = new Date()
      expireDate.setDate(expireDate.getDate() + updates.expiresInDays)
      updateData.expires_at = expireDate.toISOString()
    }
  }

  const { data: share, error } = await supabase
    .from('recording_shares')
    .update(updateData)
    .eq('id', shareId)
    .select()
    .single()

  if (error) {
    return { data: null, error: new Error(error.message) }
  }

  return { data: share as RecordingShare, error: null }
}

export function getShareUrl(shareCode: string, baseUrl: string): string {
  return `${baseUrl}/share/recording/${shareCode}`
}
