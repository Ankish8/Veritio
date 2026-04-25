import type { SupabaseClient } from '@supabase/supabase-js'
import { nanoid, customAlphabet } from 'nanoid'

// Uppercase alphanumeric without ambiguous chars (O/0, I/1/l)
const generateCode = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 8)

interface InviteCode {
  id: string
  code: string
  label: string | null
  created_by: string
  max_uses: number | null
  uses_count: number
  is_active: boolean
  expires_at: string | null
  created_at: string
  updated_at: string
}

interface InviteCodeUsage {
  id: string
  invite_code_id: string
  user_id: string
  user_email: string
  signup_method: string
  used_at: string
}

interface ValidateResult {
  valid: boolean
  error?: string
  codeId?: string
}

export async function validateInviteCode(
  supabase: SupabaseClient,
  code: string,
  logger?: { info: (...args: any[]) => void; warn: (...args: any[]) => void }
): Promise<ValidateResult> {
  const trimmed = code.trim().toUpperCase()

  const { data, error } = await supabase
    .from('invite_codes')
    .select('id, max_uses, uses_count, is_active, expires_at')
    .eq('code', trimmed)
    .single()

  if (error || !data) {
    logger?.warn('Invite code not found', { code: trimmed })
    return { valid: false, error: 'Invalid invite code' }
  }

  if (!data.is_active) {
    return { valid: false, error: 'This invite code is no longer active' }
  }

  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return { valid: false, error: 'This invite code has expired' }
  }

  if (data.max_uses !== null && data.uses_count >= data.max_uses) {
    return { valid: false, error: 'This invite code has reached its usage limit' }
  }

  return { valid: true, codeId: data.id }
}

export async function redeemInviteCode(
  supabase: SupabaseClient,
  code: string,
  userId: string,
  userEmail: string,
  signupMethod: 'email' | 'google',
  logger?: { info: (...args: any[]) => void; error: (...args: any[]) => void }
): Promise<{ success: boolean; error?: string }> {
  const trimmed = code.trim().toUpperCase()

  // Validate first
  const validation = await validateInviteCode(supabase, trimmed)
  if (!validation.valid || !validation.codeId) {
    return { success: false, error: validation.error }
  }

  // Atomic increment uses_count with conditional check
  const { data: updated, error: updateError } = await supabase
    .from('invite_codes')
    .update({
      uses_count: (await supabase
        .from('invite_codes')
        .select('uses_count')
        .eq('id', validation.codeId)
        .single()
      ).data!.uses_count + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('id', validation.codeId)
    .eq('is_active', true)
    .select()
    .single()

  if (updateError || !updated) {
    logger?.error('Failed to increment invite code uses', { error: updateError?.message })
    return { success: false, error: 'Failed to redeem invite code' }
  }

  // Record usage
  const { error: usageError } = await supabase
    .from('invite_code_usages')
    .insert({
      invite_code_id: validation.codeId,
      user_id: userId,
      user_email: userEmail.toLowerCase(),
      signup_method: signupMethod,
    })

  if (usageError) {
    logger?.error('Failed to record invite code usage', { error: usageError.message })
    // Don't fail the sign-up for a logging error
  }

  logger?.info('Invite code redeemed', { codeId: validation.codeId, userId, signupMethod })
  return { success: true }
}

export async function createInviteCodes(
  supabase: SupabaseClient,
  data: {
    label?: string
    maxUses?: number | null
    expiresAt?: string | null
    count?: number
  },
  createdBy: string,
  logger?: { info: (...args: any[]) => void; error: (...args: any[]) => void }
): Promise<{ data: InviteCode[] | null; error: string | null }> {
  const count = Math.min(Math.max(data.count || 1, 1), 50)

  const records = Array.from({ length: count }, () => ({
    code: generateCode(),
    label: data.label || null,
    created_by: createdBy,
    max_uses: data.maxUses ?? null,
    expires_at: data.expiresAt || null,
  }))

  const { data: created, error } = await supabase
    .from('invite_codes')
    .insert(records)
    .select()

  if (error) {
    logger?.error('Failed to create invite codes', { error: error.message })
    return { data: null, error: 'Failed to create invite codes' }
  }

  logger?.info('Invite codes created', { count: created.length, createdBy })
  return { data: created, error: null }
}

export async function listInviteCodes(
  supabase: SupabaseClient,
  page: number = 1,
  limit: number = 25,
  logger?: { info: (...args: any[]) => void }
): Promise<{ data: InviteCode[]; total: number }> {
  const offset = (page - 1) * limit

  const { count } = await supabase
    .from('invite_codes')
    .select('*', { count: 'exact', head: true })

  const { data, error } = await supabase
    .from('invite_codes')
    .select('*')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    logger?.info('Failed to list invite codes', { error: error.message })
    return { data: [], total: 0 }
  }

  return { data: data || [], total: count || 0 }
}

export async function getInviteCodeUsages(
  supabase: SupabaseClient,
  codeId: string,
  logger?: { info: (...args: any[]) => void }
): Promise<InviteCodeUsage[]> {
  const { data, error } = await supabase
    .from('invite_code_usages')
    .select('*')
    .eq('invite_code_id', codeId)
    .order('used_at', { ascending: false })

  if (error) {
    logger?.info('Failed to get invite code usages', { error: error.message })
    return []
  }

  return data || []
}

export async function deactivateInviteCode(
  supabase: SupabaseClient,
  codeId: string,
  logger?: { info: (...args: any[]) => void; error: (...args: any[]) => void }
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('invite_codes')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', codeId)

  if (error) {
    logger?.error('Failed to deactivate invite code', { error: error.message })
    return { success: false, error: 'Failed to deactivate invite code' }
  }

  logger?.info('Invite code deactivated', { codeId })
  return { success: true }
}

export async function updateInviteCode(
  supabase: SupabaseClient,
  codeId: string,
  updates: {
    label?: string | null
    maxUses?: number | null
    expiresAt?: string | null
    isActive?: boolean
  },
  logger?: { info: (...args: any[]) => void; error: (...args: any[]) => void }
): Promise<{ data: InviteCode | null; error: string | null }> {
  const record: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (updates.label !== undefined) record.label = updates.label
  if (updates.maxUses !== undefined) record.max_uses = updates.maxUses
  if (updates.expiresAt !== undefined) record.expires_at = updates.expiresAt
  if (updates.isActive !== undefined) record.is_active = updates.isActive

  const { data, error } = await supabase
    .from('invite_codes')
    .update(record)
    .eq('id', codeId)
    .select()
    .single()

  if (error) {
    logger?.error('Failed to update invite code', { error: error.message })
    return { data: null, error: 'Failed to update invite code' }
  }

  logger?.info('Invite code updated', { codeId })
  return { data, error: null }
}

export async function getInviteCodeStats(
  supabase: SupabaseClient
): Promise<{ total: number; active: number; totalRedemptions: number }> {
  const { count: total } = await supabase
    .from('invite_codes')
    .select('*', { count: 'exact', head: true })

  const { count: active } = await supabase
    .from('invite_codes')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)

  const { count: totalRedemptions } = await supabase
    .from('invite_code_usages')
    .select('*', { count: 'exact', head: true })

  return {
    total: total || 0,
    active: active || 0,
    totalRedemptions: totalRedemptions || 0,
  }
}
