import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@veritio/study-types'
import {
  type Organization,
  type OrganizationMember,
  type OrganizationRole,
  type OrganizationWithMeta,
  type OrganizationMemberWithUser,
  type InviteAssignableRole,
  hasRequiredRole,
} from '../lib/supabase/collaboration-types'
import { cache, cacheKeys, cacheTTL } from '../lib/cache/memory-cache'

type SupabaseClientType = SupabaseClient<Database>

// Use database types directly for insert/update operations
type DbOrganizationInsert = Database['public']['Tables']['organizations']['Insert']
type DbOrganizationUpdate = Database['public']['Tables']['organizations']['Update']
type DbOrgMemberInsert = Database['public']['Tables']['organization_members']['Insert']
type DbOrgMemberUpdate = Database['public']['Tables']['organization_members']['Update']

export async function createOrganization(
  supabase: SupabaseClientType,
  userId: string,
  input: {
    name: string
    slug: string
    avatar_url?: string | null
    settings?: Record<string, unknown>
  }
): Promise<{ data: Organization | null; error: Error | null }> {
  const { data: existing } = await supabase
    .from('organizations')
    .select('id')
    .eq('slug', input.slug)
    .is('deleted_at', null)
    .single()

  if (existing) {
    return { data: null, error: new Error('Organization slug is already taken') }
  }

  const insertData: DbOrganizationInsert = {
    name: input.name.trim(),
    slug: input.slug.toLowerCase().trim(),
    avatar_url: input.avatar_url || null,
    settings: (input.settings || { type: 'team' }) as Database['public']['Tables']['organizations']['Insert']['settings'],
    created_by_user_id: userId,
  }

  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .insert(insertData)
    .select()
    .single()

  if (orgError) {
    return { data: null, error: new Error(orgError.message) }
  }

  const { error: memberError } = await supabase.from('organization_members').insert({
    organization_id: org.id,
    user_id: userId,
    role: 'owner',
    joined_at: new Date().toISOString(),
  })

  if (memberError) {
    await supabase.from('organizations').delete().eq('id', org.id)
    return { data: null, error: new Error(memberError.message) }
  }

  return { data: org as Organization, error: null }
}

export async function getOrganization(
  supabase: SupabaseClientType,
  organizationId: string,
  userId: string
): Promise<{ data: OrganizationWithMeta | null; error: Error | null }> {
  const { data: membership, error: memberError } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .not('joined_at', 'is', null)
    .single()

  if (memberError || !membership) {
    return { data: null, error: new Error('Organization not found or access denied') }
  }

  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', organizationId)
    .is('deleted_at', null)
    .single()

  if (orgError) {
    if (orgError.code === 'PGRST116') {
      return { data: null, error: new Error('Organization not found') }
    }
    return { data: null, error: new Error(orgError.message) }
  }

  let memberCount = cache.get<number>(cacheKeys.memberCount(organizationId))
  if (memberCount === null) {
    const { count } = await supabase
      .from('organization_members')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .not('joined_at', 'is', null)
    memberCount = count || 0
    cache.set(cacheKeys.memberCount(organizationId), memberCount, cacheTTL.long)
  }

  const orgWithMeta: OrganizationWithMeta = {
    ...(org as Organization),
    member_count: memberCount || 0,
    current_user_role: membership.role as OrganizationRole,
  }

  return { data: orgWithMeta, error: null }
}

export async function getOrganizationBySlug(
  supabase: SupabaseClientType,
  slug: string,
  userId: string
): Promise<{ data: OrganizationWithMeta | null; error: Error | null }> {
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('id')
    .eq('slug', slug)
    .is('deleted_at', null)
    .single()

  if (orgError || !org) {
    return { data: null, error: new Error('Organization not found') }
  }

  return getOrganization(supabase, org.id, userId)
}

export async function listUserOrganizations(
  supabase: SupabaseClientType,
  userId: string
): Promise<{ data: OrganizationWithMeta[] | null; error: Error | null }> {
  const { data: memberships, error: memberError } = await supabase
    .from('organization_members')
    .select(`
      organization_id,
      role
    `)
    .eq('user_id', userId)
    .not('joined_at', 'is', null)

  if (memberError) {
    return { data: null, error: new Error(memberError.message) }
  }

  if (!memberships || memberships.length === 0) {
    return { data: [], error: null }
  }

  const orgIds = memberships.map((m: { organization_id: string }) => m.organization_id)
  const roleMap = new Map(memberships.map((m: { organization_id: string; role: string }) => [m.organization_id, m.role as OrganizationRole]))

  const { data: orgs, error: orgError } = await supabase
    .from('organizations')
    .select('*')
    .in('id', orgIds)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (orgError) {
    return { data: null, error: new Error(orgError.message) }
  }

  const { data: memberCounts } = await supabase
    .from('organization_members')
    .select('organization_id')
    .in('organization_id', orgIds)
    .not('joined_at', 'is', null)

  const countMap = new Map<string, number>()
  for (const m of memberCounts || []) {
    countMap.set(m.organization_id, (countMap.get(m.organization_id) || 0) + 1)
  }

   
  const orgsWithMeta: OrganizationWithMeta[] = (orgs || []).map((org: any) => {
    // Compute is_personal from settings.type (database doesn't have is_personal column)
    const settings = (org.settings || {}) as { type?: string }
    const isPersonal = settings.type === 'personal'

    return {
      ...(org as Organization),
      is_personal: isPersonal,
      member_count: countMap.get(org.id) || 0,
      current_user_role: roleMap.get(org.id),
      // Also provide user_role alias for frontend compatibility
      user_role: roleMap.get(org.id),
    }
  })

  return { data: orgsWithMeta, error: null }
}

export async function updateOrganization(
  supabase: SupabaseClientType,
  organizationId: string,
  userId: string,
  input: {
    name?: string
    slug?: string
    avatar_url?: string | null
    settings?: Record<string, unknown>
  }
): Promise<{ data: Organization | null; error: Error | null }> {
  const { data: membership } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .not('joined_at', 'is', null)
    .single()

  if (!membership || !hasRequiredRole(membership.role as OrganizationRole, 'admin')) {
    return { data: null, error: new Error('Permission denied: admin role required') }
  }

  if (input.slug) {
    const { data: existing } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', input.slug)
      .is('deleted_at', null)
      .neq('id', organizationId)
      .single()

    if (existing) {
      return { data: null, error: new Error('Organization slug is already taken') }
    }
  }

  const updates: DbOrganizationUpdate = {
    updated_at: new Date().toISOString(),
  }

  if (input.name !== undefined) updates.name = input.name.trim()
  if (input.slug !== undefined) updates.slug = input.slug.toLowerCase().trim()
  if (input.avatar_url !== undefined) updates.avatar_url = input.avatar_url
  if (input.settings !== undefined) updates.settings = input.settings as Database['public']['Tables']['organizations']['Row']['settings']

  const { data: org, error } = await supabase
    .from('organizations')
    .update(updates)
    .eq('id', organizationId)
    .is('deleted_at', null)
    .select()
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return { data: null, error: new Error('Organization not found') }
    }
    return { data: null, error: new Error(error.message) }
  }

  return { data: org as Organization, error: null }
}

export async function deleteOrganization(
  supabase: SupabaseClientType,
  organizationId: string,
  userId: string
): Promise<{ success: boolean; error: Error | null }> {
  const { data: membership } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .not('joined_at', 'is', null)
    .single()

  if (!membership || membership.role !== 'owner') {
    return { success: false, error: new Error('Permission denied: owner role required') }
  }

  const { error } = await supabase
    .from('organizations')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', organizationId)

  if (error) {
    return { success: false, error: new Error(error.message) }
  }

  return { success: true, error: null }
}

export async function listOrganizationMembers(
  supabase: SupabaseClientType,
  organizationId: string,
  userId: string
): Promise<{ data: OrganizationMemberWithUser[] | null; error: Error | null }> {
  const { data: membership } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .not('joined_at', 'is', null)
    .single()

  if (!membership) {
    return { data: null, error: new Error('Access denied: not a member') }
  }

  const { data: members, error: memberError } = await supabase
    .from('organization_members')
    .select('*')
    .eq('organization_id', organizationId)
    .not('joined_at', 'is', null)
    .order('joined_at', { ascending: true })

  if (memberError) {
    return { data: null, error: new Error(memberError.message) }
  }

  const userIds = members.map((m: { user_id: string }) => m.user_id)
  const { data: users, error: userError } = await supabase
    .from('user')
    .select('id, name, email, image')
    .in('id', userIds)

  if (userError) {
    return { data: null, error: new Error(userError.message) }
  }

  const userMap = new Map(users?.map((u) => [u.id, u]) || [])

   
  const membersWithUsers: OrganizationMemberWithUser[] = (members || []).map((m: any) => {
    const user = userMap.get(m.user_id)
    return {
      ...(m as OrganizationMember),
      user: {
        id: m.user_id,
        name: user?.name || null,
        email: user?.email || '',
        image: user?.image || null,
      },
    }
  })

  return { data: membersWithUsers, error: null }
}

export async function addOrganizationMember(
  supabase: SupabaseClientType,
  organizationId: string,
  actorUserId: string,
  targetUserId: string,
  role: InviteAssignableRole
): Promise<{ data: OrganizationMember | null; error: Error | null }> {
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

  const { data: targetUser } = await supabase
    .from('user')
    .select('id')
    .eq('id', targetUserId)
    .single()

  if (!targetUser) {
    return { data: null, error: new Error('Target user not found') }
  }

  const { data: existing } = await supabase
    .from('organization_members')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('user_id', targetUserId)
    .single()

  if (existing) {
    return { data: null, error: new Error('User is already a member of this organization') }
  }

  const insertData: DbOrgMemberInsert = {
    organization_id: organizationId,
    user_id: targetUserId,
    role,
    invited_by_user_id: actorUserId,
    invited_at: new Date().toISOString(),
    joined_at: new Date().toISOString(), // Direct add = immediately joined
  }

  const { data: member, error } = await supabase
    .from('organization_members')
    .insert(insertData)
    .select()
    .single()

  if (error) {
    return { data: null, error: new Error(error.message) }
  }

  cache.delete(cacheKeys.memberCount(organizationId))

  return { data: member as OrganizationMember, error: null }
}

export async function updateMemberRole(
  supabase: SupabaseClientType,
  organizationId: string,
  actorUserId: string,
  targetUserId: string,
  newRole: OrganizationRole
): Promise<{ data: OrganizationMember | null; error: Error | null }> {
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

  const { data: targetMembership } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', organizationId)
    .eq('user_id', targetUserId)
    .single()

  if (!targetMembership) {
    return { data: null, error: new Error('Member not found') }
  }

  // Can't change owner role (only transfer ownership - separate operation)
  if (targetMembership.role === 'owner') {
    return { data: null, error: new Error('Cannot change owner role directly. Use transfer ownership instead.') }
  }

  // Admins can't promote to owner (only owners can transfer)
  if (newRole === 'owner' && actorMembership.role !== 'owner') {
    return { data: null, error: new Error('Only owners can transfer ownership') }
  }

  const updates: DbOrgMemberUpdate = {
    role: newRole,
    updated_at: new Date().toISOString(),
  }

  const { data: member, error } = await supabase
    .from('organization_members')
    .update(updates)
    .eq('organization_id', organizationId)
    .eq('user_id', targetUserId)
    .select()
    .single()

  if (error) {
    return { data: null, error: new Error(error.message) }
  }

  // Invalidate member count cache after role change
  cache.delete(cacheKeys.memberCount(organizationId))

  return { data: member as OrganizationMember, error: null }
}

export async function removeMember(
  supabase: SupabaseClientType,
  organizationId: string,
  actorUserId: string,
  targetUserId: string
): Promise<{ success: boolean; error: Error | null }> {
  const { data: actorMembership } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', organizationId)
    .eq('user_id', actorUserId)
    .not('joined_at', 'is', null)
    .single()

  if (!actorMembership || !hasRequiredRole(actorMembership.role as OrganizationRole, 'admin')) {
    return { success: false, error: new Error('Permission denied: admin role required') }
  }

  const { data: targetMembership } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', organizationId)
    .eq('user_id', targetUserId)
    .single()

  if (!targetMembership) {
    return { success: false, error: new Error('Member not found') }
  }

  // Can't remove owners
  if (targetMembership.role === 'owner') {
    return { success: false, error: new Error('Cannot remove owner. Transfer ownership first.') }
  }

  // Admins can't remove other admins (only owners can)
  if (
    targetMembership.role === 'admin' &&
    actorMembership.role !== 'owner'
  ) {
    return { success: false, error: new Error('Only owners can remove admins') }
  }

  const { error, count } = await supabase
    .from('organization_members')
    .delete({ count: 'exact' })
    .eq('organization_id', organizationId)
    .eq('user_id', targetUserId)

  if (error) {
    return { success: false, error: new Error(error.message) }
  }

  if (count === 0) {
    return { success: false, error: new Error('Member not found') }
  }

  cache.delete(cacheKeys.memberCount(organizationId))

  return { success: true, error: null }
}

export async function leaveOrganization(
  supabase: SupabaseClientType,
  organizationId: string,
  userId: string
): Promise<{ success: boolean; error: Error | null }> {
  const { data: membership } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .not('joined_at', 'is', null)
    .single()

  if (!membership) {
    return { success: false, error: new Error('Not a member of this organization') }
  }

  // Owners can't leave (must transfer ownership first)
  if (membership.role === 'owner') {
    return { success: false, error: new Error('Owners cannot leave. Transfer ownership first.') }
  }

  const { error } = await supabase
    .from('organization_members')
    .delete()
    .eq('organization_id', organizationId)
    .eq('user_id', userId)

  if (error) {
    return { success: false, error: new Error(error.message) }
  }

  cache.delete(cacheKeys.memberCount(organizationId))

  return { success: true, error: null }
}

export async function transferOwnership(
  supabase: SupabaseClientType,
  organizationId: string,
  currentOwnerUserId: string,
  newOwnerUserId: string
): Promise<{ success: boolean; error: Error | null }> {
  const { data: currentOwnerMembership } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', organizationId)
    .eq('user_id', currentOwnerUserId)
    .not('joined_at', 'is', null)
    .single()

  if (!currentOwnerMembership || currentOwnerMembership.role !== 'owner') {
    return { success: false, error: new Error('Only owners can transfer ownership') }
  }

  const { data: newOwnerMembership } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', organizationId)
    .eq('user_id', newOwnerUserId)
    .not('joined_at', 'is', null)
    .single()

  if (!newOwnerMembership) {
    return { success: false, error: new Error('New owner must be an existing member') }
  }

  const now = new Date().toISOString()

  // NOTE: This two-step update is non-atomic. Ideally it would use an RPC call
  // for a transactional update. As a safeguard, if the second update fails we
  // roll back the first update to restore the previous role.
  const { error: newOwnerError } = await supabase
    .from('organization_members')
    .update({ role: 'owner', updated_at: now })
    .eq('organization_id', organizationId)
    .eq('user_id', newOwnerUserId)

  if (newOwnerError) {
    return { success: false, error: new Error(newOwnerError.message) }
  }

  const { error: demoteError } = await supabase
    .from('organization_members')
    .update({ role: 'admin', updated_at: now })
    .eq('organization_id', organizationId)
    .eq('user_id', currentOwnerUserId)

  if (demoteError) {
    // Rollback: restore the new owner's previous role
    await supabase
      .from('organization_members')
      .update({ role: newOwnerMembership.role, updated_at: now })
      .eq('organization_id', organizationId)
      .eq('user_id', newOwnerUserId)
    return { success: false, error: new Error(demoteError.message) }
  }

  return { success: true, error: null }
}

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 63)
}

export async function isSlugAvailable(
  supabase: SupabaseClientType,
  slug: string,
  excludeOrgId?: string
): Promise<{ available: boolean; error: Error | null }> {
  let query = supabase
    .from('organizations')
    .select('id')
    .eq('slug', slug)
    .is('deleted_at', null)

  if (excludeOrgId) {
    query = query.neq('id', excludeOrgId)
  }

  const { data, error } = await query.single()

  if (error && error.code !== 'PGRST116') {
    return { available: false, error: new Error(error.message) }
  }

  return { available: !data, error: null }
}
