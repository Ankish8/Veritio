import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@veritio/study-types'
import {
  type StudyShareLinkInsert,
  type StudyShareLinkPublic,
  type ValidateShareLinkResponse,
  hasRequiredRole,
} from '../lib/supabase/collaboration-types'
import { getStudyPermission } from './permission-service'
import bcrypt from 'bcryptjs'

type SupabaseClientType = SupabaseClient<Database>

export async function createShareLink(
  supabase: SupabaseClientType,
  studyId: string,
  userId: string,
  options?: {
    password?: string
    expiresInDays?: number | null
    allowDownload?: boolean
    allowComments?: boolean
    label?: string
  }
): Promise<{ data: StudyShareLinkPublic | null; error: Error | null }> {
  const { data: permission, error: permError } = await getStudyPermission(supabase, studyId, userId)

  if (permError) {
    return { data: null, error: permError }
  }

  if (!permission || !hasRequiredRole(permission.role, 'editor')) {
    return { data: null, error: new Error('Permission denied: editor role required') }
  }


  let passwordHash: string | null = null
  if (options?.password) {
    passwordHash = await bcrypt.hash(options.password, 10)
  }

  let expiresAt: string | null = null
  if (options?.expiresInDays) {
    const expires = new Date()
    expires.setDate(expires.getDate() + options.expiresInDays)
    expiresAt = expires.toISOString()
  }

  const insertData: StudyShareLinkInsert = {
    study_id: studyId,
    password_hash: passwordHash,
    expires_at: expiresAt,
    allow_download: options?.allowDownload ?? false,
    allow_comments: options?.allowComments ?? false,
    label: options?.label || null,
    created_by_user_id: userId,
  }

  const { data: link, error } = await supabase
    .from('study_share_links')
    .insert(insertData)
    .select()
    .single()

  if (error) {
    return { data: null, error: new Error(error.message) }
  }

  const publicLink: StudyShareLinkPublic = {
    id: link.id,
    study_id: link.study_id,
    share_token: link.share_token,
    expires_at: link.expires_at,
    allow_download: link.allow_download ?? false,
    allow_comments: link.allow_comments ?? false,
    label: link.label,
    created_by_user_id: link.created_by_user_id,
    is_active: link.is_active ?? true,
    created_at: link.created_at,
    updated_at: link.updated_at,
    view_count: link.view_count ?? 0,
    last_viewed_at: link.last_viewed_at,
    has_password: !!link.password_hash,
  }

  return { data: publicLink, error: null }
}

export async function listStudyShareLinks(
  supabase: SupabaseClientType,
  studyId: string,
  userId: string
): Promise<{ data: StudyShareLinkPublic[] | null; error: Error | null }> {
  const { data: permission, error: permError } = await getStudyPermission(supabase, studyId, userId)

  if (permError) {
    return { data: null, error: permError }
  }

  if (!permission || !hasRequiredRole(permission.role, 'editor')) {
    return { data: null, error: new Error('Permission denied: editor role required') }
  }

  const { data: links, error } = await supabase
    .from('study_share_links')
    .select('*')
    .eq('study_id', studyId)
    .order('created_at', { ascending: false })

  if (error) {
    return { data: null, error: new Error(error.message) }
  }

  const publicLinks: StudyShareLinkPublic[] = (links || []).map((link: any) => ({
    id: link.id,
    study_id: link.study_id,
    share_token: link.share_token,
    expires_at: link.expires_at,
    allow_download: link.allow_download,
    allow_comments: link.allow_comments,
    label: link.label,
    created_by_user_id: link.created_by_user_id,
    is_active: link.is_active,
    created_at: link.created_at,
    updated_at: link.updated_at,
    view_count: link.view_count,
    last_viewed_at: link.last_viewed_at,
    has_password: !!link.password_hash,
  }))

  return { data: publicLinks, error: null }
}

export async function updateShareLink(
  supabase: SupabaseClientType,
  linkId: string,
  userId: string,
  updates: {
    password?: string | null
    expiresInDays?: number | null
    allowDownload?: boolean
    allowComments?: boolean
    label?: string
    isActive?: boolean
  }
): Promise<{ data: StudyShareLinkPublic | null; error: Error | null }> {
  const { data: existing, error: fetchError } = await supabase
    .from('study_share_links')
    .select('study_id')
    .eq('id', linkId)
    .single()

  if (fetchError) {
    if (fetchError.code === 'PGRST116') {
      return { data: null, error: new Error('Share link not found') }
    }
    return { data: null, error: new Error(fetchError.message) }
  }

  const { data: permission, error: permError } = await getStudyPermission(
    supabase,
    existing.study_id,
    userId
  )

  if (permError) {
    return { data: null, error: permError }
  }

  if (!permission || !hasRequiredRole(permission.role, 'editor')) {
    return { data: null, error: new Error('Permission denied: editor role required') }
  }

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (updates.password !== undefined) {
    updateData.password_hash = updates.password
      ? await bcrypt.hash(updates.password, 10)
      : null
  }

  if (updates.expiresInDays !== undefined) {
    if (updates.expiresInDays === null) {
      updateData.expires_at = null
    } else {
      const expires = new Date()
      expires.setDate(expires.getDate() + updates.expiresInDays)
      updateData.expires_at = expires.toISOString()
    }
  }

  if (updates.allowDownload !== undefined) {
    updateData.allow_download = updates.allowDownload
  }

  if (updates.allowComments !== undefined) {
    updateData.allow_comments = updates.allowComments
  }

  if (updates.label !== undefined) {
    updateData.label = updates.label
  }

  if (updates.isActive !== undefined) {
    updateData.is_active = updates.isActive
  }

  const { data: link, error } = await supabase
    .from('study_share_links')
    .update(updateData)
    .eq('id', linkId)
    .select()
    .single()

  if (error) {
    return { data: null, error: new Error(error.message) }
  }

  const publicLink: StudyShareLinkPublic = {
    id: link.id,
    study_id: link.study_id,
    share_token: link.share_token,
    expires_at: link.expires_at,
    allow_download: link.allow_download ?? false,
    allow_comments: link.allow_comments ?? false,
    label: link.label,
    created_by_user_id: link.created_by_user_id,
    is_active: link.is_active ?? true,
    created_at: link.created_at,
    updated_at: link.updated_at,
    view_count: link.view_count ?? 0,
    last_viewed_at: link.last_viewed_at,
    has_password: !!link.password_hash,
  }

  return { data: publicLink, error: null }
}

export async function revokeShareLink(
  supabase: SupabaseClientType,
  linkId: string,
  userId: string
): Promise<{ success: boolean; error: Error | null }> {
  const { data: existing, error: fetchError } = await supabase
    .from('study_share_links')
    .select('study_id')
    .eq('id', linkId)
    .single()

  if (fetchError) {
    if (fetchError.code === 'PGRST116') {
      return { success: false, error: new Error('Share link not found') }
    }
    return { success: false, error: new Error(fetchError.message) }
  }

  const { data: permission, error: permError } = await getStudyPermission(
    supabase,
    existing.study_id,
    userId
  )

  if (permError) {
    return { success: false, error: permError }
  }

  if (!permission || !hasRequiredRole(permission.role, 'editor')) {
    return { success: false, error: new Error('Permission denied: editor role required') }
  }

  const { error } = await supabase
    .from('study_share_links')
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', linkId)

  if (error) {
    return { success: false, error: new Error(error.message) }
  }

  return { success: true, error: null }
}

export async function validateShareLink(
  supabase: SupabaseClientType,
  token: string,
  password?: string
): Promise<{ data: ValidateShareLinkResponse | null; error: Error | null }> {
  const { data: link, error: fetchError } = await supabase
    .from('study_share_links')
    .select(`
      *,
      studies!inner (
        id,
        title,
        status
      )
    `)
    .eq('share_token', token)
    .single()

  if (fetchError) {
    if (fetchError.code === 'PGRST116') {
      return {
        data: {
          valid: false,
          requires_password: false,
          expired: false,
        },
        error: null,
      }
    }
    return { data: null, error: new Error(fetchError.message) }
  }

  if (!link.is_active) {
    return {
      data: {
        valid: false,
        requires_password: false,
        expired: false,
      },
      error: null,
    }
  }

  if (link.expires_at && new Date(link.expires_at) < new Date()) {
    return {
      data: {
        valid: false,
        requires_password: false,
        expired: true,
      },
      error: null,
    }
  }

  if (link.password_hash) {
    if (!password) {
      return {
        data: {
          valid: false,
          requires_password: true,
          expired: false,
        },
        error: null,
      }
    }

    const passwordValid = await bcrypt.compare(password, link.password_hash)
    if (!passwordValid) {
      return {
        data: {
          valid: false,
          requires_password: true,
          expired: false,
        },
        error: null,
      }
    }
  }

  const study = link.studies as unknown as { id: string; title: string; status: string }

  return {
    data: {
      valid: true,
      requires_password: false,
      expired: false,
      study_id: study.id,
      study_title: study.title,
      permissions: {
        allow_download: link.allow_download ?? false,
        allow_comments: link.allow_comments ?? false,
      },
    },
    error: null,
  }
}

export async function trackShareLinkView(
  supabase: SupabaseClientType,
  token: string,
  _metadata?: {
    ip?: string
    userAgent?: string
    referrer?: string
  }
): Promise<{ success: boolean; error: Error | null }> {
  const { data: link } = await supabase
    .from('study_share_links')
    .select('view_count')
    .eq('share_token', token)
    .eq('is_active', true)
    .single()

  if (link) {
    await supabase
      .from('study_share_links')
      .update({
        view_count: (link.view_count || 0) + 1,
        last_viewed_at: new Date().toISOString(),
      })
      .eq('share_token', token)
  }

  return { success: true, error: null }
}

export function getShareLinkUrl(token: string, baseUrl: string): string {
  return `${baseUrl}/share/${token}`
}
