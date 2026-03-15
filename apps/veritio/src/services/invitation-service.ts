import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@veritio/study-types'
import {
  type OrganizationInvitation,
  type OrganizationInvitationInsert,
  type OrganizationMember,
  type OrganizationRole,
  type InviteAssignableRole,
  type InvitationWithOrganization,
  hasRequiredRole,
} from '../lib/supabase/collaboration-types'
import { nanoid } from 'nanoid'

type SupabaseClientType = SupabaseClient<Database>

export async function createEmailInvitation(
  supabase: SupabaseClientType,
  organizationId: string,
  actorUserId: string,
  email: string,
  role: InviteAssignableRole,
  options?: {
    message?: string
    expiresInDays?: number
  }
): Promise<{ data: OrganizationInvitation | null; error: Error | null }> {
  const { data: actorMembership } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', organizationId)
    .eq('user_id', actorUserId)
    .not('joined_at', 'is', null)
    .single()

  if (!actorMembership || !hasRequiredRole(actorMembership.role as OrganizationRole, 'admin')) {
    return { data: null, error: new Error('Permission denied: admin role required') }
  }

  const { data: existingUser } = await supabase
    .from('user')
    .select('id')
    .eq('email', email.toLowerCase())
    .single()

  if (existingUser) {
    const { data: existingMember } = await supabase
      .from('organization_members')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('user_id', existingUser.id)
      .single()

    if (existingMember) {
      return { data: null, error: new Error('User is already a member of this organization') }
    }
  }

  const { data: existingInvite } = await supabase
    .from('organization_invitations')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('email', email.toLowerCase())
    .eq('invite_type', 'email')
    .eq('status', 'pending')
    .single()

  if (existingInvite) {
    return { data: null, error: new Error('A pending invitation already exists for this email') }
  }

  const expiresInDays = options?.expiresInDays || 7
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + expiresInDays)

  const insertData: OrganizationInvitationInsert = {
    organization_id: organizationId,
    invite_type: 'email',
    email: email.toLowerCase(),
    invite_token: nanoid(32),
    role,
    invited_by_user_id: actorUserId,
    message: options?.message || null,
    expires_at: expiresAt.toISOString(),
  }

  const { data: invitation, error } = await supabase
    .from('organization_invitations')
    .insert(insertData)
    .select()
    .single()

  if (error) {
    return { data: null, error: new Error(error.message) }
  }

  // TODO: Send email notification (integrate with Resend)
  // await sendInvitationEmail(email, invitation.invite_token, organizationId)

  return { data: invitation as OrganizationInvitation, error: null }
}

export async function createInviteLink(
  supabase: SupabaseClientType,
  organizationId: string,
  actorUserId: string,
  role: InviteAssignableRole,
  options?: {
    maxUses?: number | null
    expiresInDays?: number | null
  }
): Promise<{ data: OrganizationInvitation | null; error: Error | null }> {
  const { data: actorMembership } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', organizationId)
    .eq('user_id', actorUserId)
    .not('joined_at', 'is', null)
    .single()

  if (!actorMembership || !hasRequiredRole(actorMembership.role as OrganizationRole, 'admin')) {
    return { data: null, error: new Error('Permission denied: admin role required') }
  }

  let expiresAt: string | null = null
  if (options?.expiresInDays) {
    const expires = new Date()
    expires.setDate(expires.getDate() + options.expiresInDays)
    expiresAt = expires.toISOString()
  }

  const insertData: OrganizationInvitationInsert = {
    organization_id: organizationId,
    invite_type: 'link',
    invite_token: nanoid(32),
    max_uses: options?.maxUses ?? null,
    role,
    invited_by_user_id: actorUserId,
    expires_at: expiresAt,
  }

  const { data: invitation, error } = await supabase
    .from('organization_invitations')
    .insert(insertData)
    .select()
    .single()

  if (error) {
    return { data: null, error: new Error(error.message) }
  }

  return { data: invitation as OrganizationInvitation, error: null }
}

export async function acceptInvitation(
  supabase: SupabaseClientType,
  token: string,
  userId: string
): Promise<{ data: OrganizationMember | null; error: Error | null }> {
  const { data: invitation, error: inviteError } = await supabase
    .from('organization_invitations')
    .select('*')
    .eq('invite_token', token)
    .single()

  if (inviteError || !invitation) {
    return { data: null, error: new Error('Invalid invitation token') }
  }

  if (invitation.status !== 'pending') {
    return { data: null, error: new Error(`Invitation is ${invitation.status}`) }
  }

  if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
    await supabase
      .from('organization_invitations')
      .update({ status: 'expired', updated_at: new Date().toISOString() })
      .eq('id', invitation.id)
    return { data: null, error: new Error('Invitation has expired') }
  }

  if (invitation.invite_type === 'email' && invitation.email) {
    const { data: user } = await supabase
      .from('user')
      .select('email')
      .eq('id', userId)
      .single()

    if (!user || user.email.toLowerCase() !== invitation.email.toLowerCase()) {
      return { data: null, error: new Error('This invitation was sent to a different email address') }
    }
  }

  if (
    invitation.invite_type === 'link' &&
    invitation.max_uses !== null &&
    invitation.uses_count >= invitation.max_uses
  ) {
    return { data: null, error: new Error('Invitation link has reached maximum uses') }
  }

  const { data: existingMember } = await supabase
    .from('organization_members')
    .select('id')
    .eq('organization_id', invitation.organization_id)
    .eq('user_id', userId)
    .single()

  if (existingMember) {
    return { data: null, error: new Error('You are already a member of this organization') }
  }

  const now = new Date().toISOString()
  const { data: member, error: memberError } = await supabase
    .from('organization_members')
    .insert({
      organization_id: invitation.organization_id,
      user_id: userId,
      role: invitation.role as OrganizationRole,
      invited_by_user_id: invitation.invited_by_user_id,
      invited_at: invitation.created_at,
      joined_at: now,
    })
    .select()
    .single()

  if (memberError) {
    return { data: null, error: new Error(memberError.message) }
  }

  if (invitation.invite_type === 'email') {
    await supabase
      .from('organization_invitations')
      .update({
        status: 'accepted',
        accepted_at: now,
        accepted_by_user_id: userId,
        updated_at: now,
      })
      .eq('id', invitation.id)
  } else {
    await supabase
      .from('organization_invitations')
      .update({
        uses_count: invitation.uses_count + 1,
        accepted_at: now, // Last accepted time
        accepted_by_user_id: userId, // Last accepted user
        updated_at: now,
      })
      .eq('id', invitation.id)
  }

  return { data: member as OrganizationMember, error: null }
}

export async function getInvitationByToken(
  supabase: SupabaseClientType,
  token: string
): Promise<{ data: InvitationWithOrganization | null; error: Error | null }> {
  const { data: invitation, error } = await supabase
    .from('organization_invitations')
    .select(`
      *,
      organizations!inner (
        id,
        name,
        slug,
        avatar_url
      )
    `)
    .eq('invite_token', token)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return { data: null, error: new Error('Invitation not found') }
    }
    return { data: null, error: new Error(error.message) }
  }

  if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
    return { data: null, error: new Error('Invitation has expired') }
  }

  if (invitation.status !== 'pending') {
    return { data: null, error: new Error(`Invitation is ${invitation.status}`) }
  }

  const result: InvitationWithOrganization = {
    ...(invitation as unknown as OrganizationInvitation),
    organization: {
      id: (invitation.organizations as unknown as { id: string; name: string; slug: string; avatar_url: string | null }).id,
      name: (invitation.organizations as unknown as { id: string; name: string; slug: string; avatar_url: string | null }).name,
      slug: (invitation.organizations as unknown as { id: string; name: string; slug: string; avatar_url: string | null }).slug,
      avatar_url: (invitation.organizations as unknown as { id: string; name: string; slug: string; avatar_url: string | null }).avatar_url,
    },
  }

  return { data: result, error: null }
}

export async function listPendingInvitations(
  supabase: SupabaseClientType,
  organizationId: string,
  actorUserId: string
): Promise<{ data: OrganizationInvitation[] | null; error: Error | null }> {
  const { data: actorMembership } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', organizationId)
    .eq('user_id', actorUserId)
    .not('joined_at', 'is', null)
    .single()

  if (!actorMembership || !hasRequiredRole(actorMembership.role as OrganizationRole, 'admin')) {
    return { data: null, error: new Error('Permission denied: admin role required') }
  }

  const { data: invitations, error } = await supabase
    .from('organization_invitations')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) {
    return { data: null, error: new Error(error.message) }
  }

  return { data: invitations as OrganizationInvitation[], error: null }
}

export async function listAllInvitations(
  supabase: SupabaseClientType,
  organizationId: string,
  actorUserId: string,
  options?: {
    status?: string[]
    inviteType?: string
  }
): Promise<{ data: OrganizationInvitation[] | null; error: Error | null }> {
  const { data: actorMembership } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', organizationId)
    .eq('user_id', actorUserId)
    .not('joined_at', 'is', null)
    .single()

  if (!actorMembership || !hasRequiredRole(actorMembership.role as OrganizationRole, 'admin')) {
    return { data: null, error: new Error('Permission denied: admin role required') }
  }

  let query = supabase
    .from('organization_invitations')
    .select('*')
    .eq('organization_id', organizationId)

  if (options?.status && options.status.length > 0) {
    query = query.in('status', options.status)
  }

  if (options?.inviteType) {
    query = query.eq('invite_type', options.inviteType)
  }

  const { data: invitations, error } = await query.order('created_at', { ascending: false })

  if (error) {
    return { data: null, error: new Error(error.message) }
  }

  return { data: invitations as OrganizationInvitation[], error: null }
}

export async function revokeInvitation(
  supabase: SupabaseClientType,
  invitationId: string,
  actorUserId: string
): Promise<{ success: boolean; error: Error | null }> {
  const { data: invitation, error: inviteError } = await supabase
    .from('organization_invitations')
    .select('organization_id, status')
    .eq('id', invitationId)
    .single()

  if (inviteError || !invitation) {
    return { success: false, error: new Error('Invitation not found') }
  }

  const { data: actorMembership } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', invitation.organization_id)
    .eq('user_id', actorUserId)
    .not('joined_at', 'is', null)
    .single()

  if (!actorMembership || !hasRequiredRole(actorMembership.role as OrganizationRole, 'admin')) {
    return { success: false, error: new Error('Permission denied: admin role required') }
  }

  if (invitation.status !== 'pending') {
    return { success: false, error: new Error(`Cannot revoke ${invitation.status} invitation`) }
  }

  const { error } = await supabase
    .from('organization_invitations')
    .update({
      status: 'revoked',
      updated_at: new Date().toISOString(),
    })
    .eq('id', invitationId)

  if (error) {
    return { success: false, error: new Error(error.message) }
  }

  return { success: true, error: null }
}

export async function resendEmailInvitation(
  supabase: SupabaseClientType,
  invitationId: string,
  actorUserId: string
): Promise<{ data: OrganizationInvitation | null; error: Error | null }> {
  const { data: original, error: originalError } = await supabase
    .from('organization_invitations')
    .select('*')
    .eq('id', invitationId)
    .single()

  if (originalError || !original) {
    return { data: null, error: new Error('Invitation not found') }
  }

  if (original.invite_type !== 'email') {
    return { data: null, error: new Error('Can only resend email invitations') }
  }

  await revokeInvitation(supabase, invitationId, actorUserId)

  return createEmailInvitation(
    supabase,
    original.organization_id,
    actorUserId,
    original.email!,
    original.role as InviteAssignableRole,
    { message: original.message || undefined }
  )
}

export function getInviteLinkUrl(token: string, baseUrl: string): string {
  return `${baseUrl}/invite/${token}`
}

export async function expireOldInvitations(
  supabase: SupabaseClientType
): Promise<{ count: number; error: Error | null }> {
  const now = new Date().toISOString()

  const { count, error } = await supabase
    .from('organization_invitations')
    .update({ status: 'expired', updated_at: now })
    .eq('status', 'pending')
    .lt('expires_at', now)

  if (error) {
    return { count: 0, error: new Error(error.message) }
  }

  return { count: count || 0, error: null }
}
