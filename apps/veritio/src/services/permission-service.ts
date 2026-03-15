// Role Hierarchy: owner (4) → admin (3) → editor (2) → viewer (1)
// Permission Inheritance: Organization Role → Project (can override) → Study (inherited from project)

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@veritio/study-types'
import {
  type OrganizationRole,
  type PermissionContext,
  type MemberSource,
  calculatePermissions,
  hasRequiredRole,
} from '../lib/supabase/collaboration-types'

type SupabaseClientType = SupabaseClient<Database>

export async function getOrganizationRole(
  supabase: SupabaseClientType,
  organizationId: string,
  userId: string
): Promise<{ data: OrganizationRole | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .not('joined_at', 'is', null)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return { data: null, error: null }
    }
    return { data: null, error: new Error(error.message) }
  }

  return { data: data.role as OrganizationRole, error: null }
}

export async function checkOrganizationPermission(
  supabase: SupabaseClientType,
  organizationId: string,
  userId: string,
  requiredRole: OrganizationRole
): Promise<{ allowed: boolean; userRole: OrganizationRole | null; error: Error | null }> {
  const { data: userRole, error } = await getOrganizationRole(supabase, organizationId, userId)

  if (error) {
    return { allowed: false, userRole: null, error }
  }

  if (!userRole) {
    return { allowed: false, userRole: null, error: null }
  }

  const allowed = hasRequiredRole(userRole, requiredRole)
  return { allowed, userRole, error: null }
}

export async function getOrganizationPermission(
  supabase: SupabaseClientType,
  organizationId: string,
  userId: string
): Promise<{ data: PermissionContext | null; error: Error | null }> {
  const { data: role, error } = await getOrganizationRole(supabase, organizationId, userId)

  if (error) {
    return { data: null, error }
  }

  if (!role) {
    return { data: null, error: null }
  }

  const context: PermissionContext = {
    userId,
    organizationId,
    role,
    source: 'inherited',
    permissions: calculatePermissions(role),
  }

  return { data: context, error: null }
}

export async function getProjectPermission(
  supabase: SupabaseClientType,
  projectId: string,
  userId: string
): Promise<{ data: PermissionContext | null; error: Error | null }> {
  // organization_id added in migration but not yet in generated types
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, organization_id, user_id, visibility')
    .eq('id', projectId)
    .single()

  if (projectError) {
    if (projectError.code === 'PGRST116') {
      return { data: null, error: new Error('Project not found') }
    }
    return { data: null, error: new Error(projectError.message) }
  }

  // Legacy personal project — only original owner has access
  if (!project.organization_id) {
    if (project.user_id === userId) {
      const context: PermissionContext = {
        userId,
        projectId,
        role: 'owner',
        source: 'explicit',
        permissions: calculatePermissions('owner'),
      }
      return { data: context, error: null }
    }
    return { data: null, error: null }
  }

  const { data: projectMember, error: pmError } = await supabase
    .from('project_members')
    .select('role, source')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .single()

  if (!pmError && projectMember) {
    const context: PermissionContext = {
      userId,
      organizationId: project.organization_id,
      projectId,
      role: projectMember.role as OrganizationRole,
      source: projectMember.source as MemberSource,
      permissions: calculatePermissions(projectMember.role as OrganizationRole),
    }
    return { data: context, error: null }
  }

  // Fall back to organization role
  const { data: orgRole, error: orgError } = await getOrganizationRole(
    supabase,
    project.organization_id,
    userId
  )

  if (orgError) {
    return { data: null, error: orgError }
  }

  if (!orgRole) {
    return { data: null, error: null }
  }

  const context: PermissionContext = {
    userId,
    organizationId: project.organization_id,
    projectId,
    role: orgRole,
    source: 'inherited',
    permissions: calculatePermissions(orgRole),
  }

  return { data: context, error: null }
}

export async function checkProjectPermission(
  supabase: SupabaseClientType,
  projectId: string,
  userId: string,
  requiredRole: OrganizationRole
): Promise<{ allowed: boolean; userRole: OrganizationRole | null; error: Error | null }> {
  const { data: context, error } = await getProjectPermission(supabase, projectId, userId)

  if (error) {
    return { allowed: false, userRole: null, error }
  }

  if (!context) {
    return { allowed: false, userRole: null, error: null }
  }

  const allowed = hasRequiredRole(context.role, requiredRole)
  return { allowed, userRole: context.role, error: null }
}

export async function getStudyPermission(
  supabase: SupabaseClientType,
  studyId: string,
  userId: string
): Promise<{ data: PermissionContext | null; error: Error | null }> {
  const { data: study, error: studyError } = await supabase
    .from('studies')
    .select('id, project_id, user_id')
    .eq('id', studyId)
    .single()

  if (studyError) {
    if (studyError.code === 'PGRST116') {
      return { data: null, error: new Error('Study not found') }
    }
    return { data: null, error: new Error(studyError.message) }
  }

  const { data: projectContext, error: projectError } = await getProjectPermission(
    supabase,
    study.project_id,
    userId
  )

  if (projectError) {
    return { data: null, error: projectError }
  }

  if (!projectContext) {
    return { data: null, error: null }
  }

  const context: PermissionContext = {
    ...projectContext,
    studyId,
  }

  return { data: context, error: null }
}

export async function checkStudyPermission(
  supabase: SupabaseClientType,
  studyId: string,
  userId: string,
  requiredRole: OrganizationRole
): Promise<{ allowed: boolean; userRole: OrganizationRole | null; error: Error | null }> {
  const { data: context, error } = await getStudyPermission(supabase, studyId, userId)

  if (error) {
    return { allowed: false, userRole: null, error }
  }

  if (!context) {
    return { allowed: false, userRole: null, error: null }
  }

  const allowed = hasRequiredRole(context.role, requiredRole)
  return { allowed, userRole: context.role, error: null }
}

export type ResourceType = 'organization' | 'project' | 'study'

export async function canPerformAction(
  supabase: SupabaseClientType,
  resourceType: ResourceType,
  resourceId: string,
  userId: string,
  requiredRole: OrganizationRole
): Promise<{ allowed: boolean; error: Error | null }> {
  let result: { allowed: boolean; userRole: OrganizationRole | null; error: Error | null }

  switch (resourceType) {
    case 'organization':
      result = await checkOrganizationPermission(supabase, resourceId, userId, requiredRole)
      break
    case 'project':
      result = await checkProjectPermission(supabase, resourceId, userId, requiredRole)
      break
    case 'study':
      result = await checkStudyPermission(supabase, resourceId, userId, requiredRole)
      break
    default:
      return { allowed: false, error: new Error(`Unknown resource type: ${resourceType}`) }
  }

  return { allowed: result.allowed, error: result.error }
}

export interface PreloadedPermissionData {
  /** Project metadata (id, organization_id, user_id, visibility) keyed by project id */
  projects: Array<{ id: string; organization_id: string | null; user_id: string | null; visibility: string | null }>
  /** Organization roles the user already has, keyed by organization_id */
  orgRolesMap: Map<string, OrganizationRole>
}

export async function getProjectPermissionsBatch(
  supabase: SupabaseClientType,
  projectIds: string[],
  userId: string,
  preloaded?: PreloadedPermissionData
): Promise<{ data: Map<string, PermissionContext>; error: Error | null }> {
  const permissionsMap = new Map<string, PermissionContext>()

  if (projectIds.length === 0) {
    return { data: permissionsMap, error: null }
  }

  // Use preloaded data if available, otherwise fetch from DB
  let projects: Array<{ id: string; organization_id: string | null; user_id: string | null; visibility: string | null }>
  let orgRolesMap: Map<string, OrganizationRole>

  if (preloaded) {
    projects = preloaded.projects
    orgRolesMap = preloaded.orgRolesMap
  } else {
    // organization_id added in migration but not yet in generated types
    const { data: projectsData, error: projectsError } = await supabase
      .from('projects')
      .select('id, organization_id, user_id, visibility')
      .in('id', projectIds)

    if (projectsError) {
      return { data: permissionsMap, error: new Error(projectsError.message) }
    }

    projects = projectsData as any[]

    const orgIds = [...new Set((projects as any[])
      .filter((p: any) => p.organization_id)
      .map((p: any) => p.organization_id as string)
    )]

    orgRolesMap = new Map<string, OrganizationRole>()
    if (orgIds.length > 0) {
      const { data: memberships, error: memberError } = await supabase
        .from('organization_members')
        .select('organization_id, role')
        .eq('user_id', userId)
        .in('organization_id', orgIds)
        .not('joined_at', 'is', null)

      if (memberError) {
        return { data: permissionsMap, error: new Error(memberError.message) }
      }

      for (const m of (memberships || []) as any[]) {
        orgRolesMap.set(m.organization_id, m.role as OrganizationRole)
      }
    }
  }

  // project_members is always fetched — it's the only unique query
  const projectRolesMap = new Map<string, { role: OrganizationRole; source: MemberSource }>()
  const { data: projectMembers, error: pmError } = await supabase
    .from('project_members')
    .select('project_id, role, source')
    .eq('user_id', userId)
    .in('project_id', projectIds)

  if (!pmError && projectMembers) {
    for (const pm of projectMembers) {
      projectRolesMap.set(pm.project_id, {
        role: pm.role as OrganizationRole,
        source: pm.source as MemberSource,
      })
    }
  }

  for (const project of projects) {
    const projectOverride = projectRolesMap.get(project.id)
    if (projectOverride) {
      permissionsMap.set(project.id, {
        userId,
        organizationId: project.organization_id || undefined,
        projectId: project.id,
        role: projectOverride.role,
        source: projectOverride.source,
        permissions: calculatePermissions(projectOverride.role),
      })
      continue
    }

    if (!project.organization_id) {
      if (project.user_id === userId) {
        permissionsMap.set(project.id, {
          userId,
          projectId: project.id,
          role: 'owner',
          source: 'explicit',
          permissions: calculatePermissions('owner'),
        })
      }
      continue
    }

    const orgRole = orgRolesMap.get(project.organization_id)
    if (orgRole) {
      permissionsMap.set(project.id, {
        userId,
        organizationId: project.organization_id,
        projectId: project.id,
        role: orgRole,
        source: 'inherited',
        permissions: calculatePermissions(orgRole),
      })
    }
  }

  return { data: permissionsMap, error: null }
}

export async function getStudyPermissionsBatch(
  supabase: SupabaseClientType,
  studyIds: string[],
  userId: string
): Promise<{ data: Map<string, PermissionContext>; error: Error | null }> {
  const permissionsMap = new Map<string, PermissionContext>()

  if (studyIds.length === 0) {
    return { data: permissionsMap, error: null }
  }

  const { data: studies, error: studiesError } = await supabase
    .from('studies')
    .select('id, project_id')
    .in('id', studyIds)

  if (studiesError) {
    return { data: permissionsMap, error: new Error(studiesError.message) }
  }

  const projectIds = [...new Set(studies.map(s => s.project_id))]

  const { data: projectPermissions, error: projectError } = await getProjectPermissionsBatch(
    supabase,
    projectIds,
    userId
  )

  if (projectError) {
    return { data: permissionsMap, error: projectError }
  }

  for (const study of studies) {
    const projectContext = projectPermissions.get(study.project_id)
    if (projectContext) {
      permissionsMap.set(study.id, {
        ...projectContext,
        studyId: study.id,
      })
    }
  }

  return { data: permissionsMap, error: null }
}

export async function canView(
  supabase: SupabaseClientType,
  resourceType: ResourceType,
  resourceId: string,
  userId: string
): Promise<boolean> {
  const { allowed } = await canPerformAction(supabase, resourceType, resourceId, userId, 'viewer')
  return allowed
}

export async function canEdit(
  supabase: SupabaseClientType,
  resourceType: ResourceType,
  resourceId: string,
  userId: string
): Promise<boolean> {
  const { allowed } = await canPerformAction(supabase, resourceType, resourceId, userId, 'editor')
  return allowed
}

export async function canManage(
  supabase: SupabaseClientType,
  resourceType: ResourceType,
  resourceId: string,
  userId: string
): Promise<boolean> {
  const { allowed } = await canPerformAction(supabase, resourceType, resourceId, userId, 'admin')
  return allowed
}

export async function isOwner(
  supabase: SupabaseClientType,
  resourceType: ResourceType,
  resourceId: string,
  userId: string
): Promise<boolean> {
  const { allowed } = await canPerformAction(supabase, resourceType, resourceId, userId, 'owner')
  return allowed
}

export function permissionDeniedError(action: string, requiredRole: string, userRole: string | null): Error {
  const reason = userRole
    ? `Permission denied: ${action} requires ${requiredRole} role, you have ${userRole}`
    : 'Permission denied: you are not a member of this organization'
  return new Error(reason)
}

export {
  ROLE_LEVELS,
  calculatePermissions,
  hasRequiredRole,
  type OrganizationRole,
  type PermissionContext,
  type PermissionFlags,
  type MemberSource,
} from '../lib/supabase/collaboration-types'
