import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@veritio/study-types'
import type { Project, ProjectInsert, ProjectUpdate } from './types'
import {
  getProjectPermission,
  checkProjectPermission,
  checkOrganizationPermission,
  getProjectPermissionsBatch,
  permissionDeniedError,
} from './permission-service'
import type { PreloadedPermissionData } from './permission-service'
import type { OrganizationRole, ProjectVisibility } from '../lib/supabase/collaboration-types'

type SupabaseClientType = SupabaseClient<Database>

export interface ProjectWithStudyCount extends Project {
  study_count: number
}

export interface ProjectWithPermission extends ProjectWithStudyCount {
  user_role: OrganizationRole
  permission_source: 'inherited' | 'explicit'
}

export async function listProjects(
  supabase: SupabaseClientType,
  userId: string,
  options: { includeArchived?: boolean; organizationId?: string } = {}
): Promise<{ data: ProjectWithPermission[] | null; error: Error | null }> {
  // Fetch org memberships with role (needed for preloaded permissions)
  const { data: memberships, error: memberError } = await supabase
    .from('organization_members')
    .select('organization_id, role')
    .eq('user_id', userId)
    .not('joined_at', 'is', null)

  if (memberError) {
    return { data: null, error: new Error(memberError.message) }
  }

  const orgIds = memberships?.map((m) => m.organization_id) || []

  if (orgIds.length === 0) {
    return { data: [], error: null }
  }

  // Build orgRolesMap from memberships we already fetched
  const orgRolesMap = new Map<string, OrganizationRole>()
  for (const m of memberships || []) {
    orgRolesMap.set(m.organization_id, m.role as OrganizationRole)
  }

  // Use count subquery instead of fetching all study rows
  let query = supabase
    .from('projects')
    .select(`
      *,
      studies(count)
    `)
    .in('organization_id', options.organizationId ? [options.organizationId] : orgIds)
    .eq('studies.is_archived', false)

  if (!options.includeArchived) {
    query = query.eq('is_archived', false)
  }

  const { data: projects, error } = await query.order('created_at', { ascending: false })

  if (error) {
    return { data: null, error: new Error(error.message) }
  }

  if (!projects || projects.length === 0) {
    return { data: [], error: null }
  }

  // Build preloaded data to avoid redundant DB queries in permission batch
  const projectIds = projects.map((p) => p.id)
  const preloaded: PreloadedPermissionData = {
    projects: (projects as any[]).map((p) => ({
      id: p.id,
      organization_id: p.organization_id,
      user_id: p.user_id,
      visibility: p.visibility,
    })),
    orgRolesMap,
  }

  const { data: permissionsMap, error: permError } = await getProjectPermissionsBatch(
    supabase,
    projectIds,
    userId,
    preloaded
  )

  if (permError) {
    return { data: null, error: permError }
  }

  const projectsWithPermissions: ProjectWithPermission[] = ((projects || []) as unknown as Array<Record<string, unknown> & { id: string }>)
    .filter((p) => permissionsMap.has(p.id))
    .map((project) => {
      const permission = permissionsMap.get(project.id)
      const countResult = (project as any).studies as Array<{ count: number }>
      return {
        ...project,
        study_count: countResult?.[0]?.count ?? 0,
        user_role: permission?.role || 'viewer',
        permission_source: permission?.source || 'inherited',
      }
    }) as ProjectWithPermission[]

  return { data: projectsWithPermissions, error: null }
}

export async function getProject(
  supabase: SupabaseClientType,
  projectId: string,
  userId: string
): Promise<{ data: (Project & { user_role?: OrganizationRole }) | null; error: Error | null }> {
  const { data: permission, error: permError } = await getProjectPermission(supabase, projectId, userId)

  if (permError) {
    return { data: null, error: permError }
  }

  if (!permission) {
    return { data: null, error: new Error('Project not found') }
  }

  const { data: project, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return { data: null, error: new Error('Project not found') }
    }
    return { data: null, error: new Error(error.message) }
  }

  return { data: { ...project, user_role: permission.role }, error: null }
}

export async function createProject(
  supabase: SupabaseClientType,
  userId: string,
  input: {
    name: string
    description?: string | null
    organizationId: string
    visibility?: ProjectVisibility
  }
): Promise<{ data: Project | null; error: Error | null }> {
  const { allowed, userRole, error: permError } = await checkOrganizationPermission(
    supabase,
    input.organizationId,
    userId,
    'editor'
  )

  if (permError) {
    return { data: null, error: permError }
  }

  if (!allowed) {
    return { data: null, error: permissionDeniedError('creating a project', 'editor', userRole) }
  }

  const insertData: ProjectInsert = {
    user_id: userId,
    organization_id: input.organizationId,
    name: input.name.trim(),
    description: input.description?.trim() || null,
    visibility: input.visibility || 'private',
  }

  const { data: project, error } = await supabase
    .from('projects')
    .insert(insertData)
    .select()
    .single()

  if (error) {
    return { data: null, error: new Error(error.message) }
  }

  return { data: project, error: null }
}

export async function updateProject(
  supabase: SupabaseClientType,
  projectId: string,
  userId: string,
  input: { name?: string; description?: string | null; visibility?: ProjectVisibility }
): Promise<{ data: Project | null; error: Error | null }> {
  const { allowed, userRole, error: permError } = await checkProjectPermission(
    supabase,
    projectId,
    userId,
    'editor'
  )

  if (permError) {
    return { data: null, error: permError }
  }

  if (!allowed) {
    return { data: null, error: permissionDeniedError('updating a project', 'editor', userRole) }
  }

  const updates: ProjectUpdate & { updated_at: string } = {
    updated_at: new Date().toISOString(),
  }
  if (input.name !== undefined) updates.name = input.name.trim()
  if (input.description !== undefined) updates.description = input.description?.trim() || null
  if (input.visibility !== undefined) updates.visibility = input.visibility

  const { data: project, error } = await supabase
    .from('projects')
    .update(updates)
    .eq('id', projectId)
    .select()
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return { data: null, error: new Error('Project not found') }
    }
    return { data: null, error: new Error(error.message) }
  }

  return { data: project, error: null }
}

export async function deleteProject(
  supabase: SupabaseClientType,
  projectId: string,
  userId: string
): Promise<{ success: boolean; error: Error | null }> {
  const { allowed, userRole, error: permError } = await checkProjectPermission(
    supabase,
    projectId,
    userId,
    'admin'
  )

  if (permError) {
    return { success: false, error: permError }
  }

  if (!allowed) {
    return { success: false, error: permissionDeniedError('deleting a project', 'admin', userRole) }
  }

  const { error, count } = await supabase
    .from('projects')
    .delete({ count: 'exact' })
    .eq('id', projectId)

  if (error) {
    return { success: false, error: new Error(error.message) }
  }

  if (count === 0) {
    return { success: false, error: new Error('Project not found') }
  }

  return { success: true, error: null }
}

export async function archiveProject(
  supabase: SupabaseClientType,
  projectId: string,
  userId: string
): Promise<{ data: Project | null; error: Error | null }> {
  const { allowed, userRole, error: permError } = await checkProjectPermission(
    supabase,
    projectId,
    userId,
    'editor'
  )

  if (permError) {
    return { data: null, error: permError }
  }

  if (!allowed) {
    return { data: null, error: permissionDeniedError('archiving a project', 'editor', userRole) }
  }

  const { data: project, error } = await supabase
    .from('projects')
    .update({ is_archived: true, updated_at: new Date().toISOString() })
    .eq('id', projectId)
    .select()
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return { data: null, error: new Error('Project not found') }
    }
    return { data: null, error: new Error(error.message) }
  }

  await supabase
    .from('studies')
    .update({ is_archived: true, updated_at: new Date().toISOString() })
    .eq('project_id', projectId)

  return { data: project, error: null }
}

export async function restoreProject(
  supabase: SupabaseClientType,
  projectId: string,
  userId: string
): Promise<{ data: Project | null; error: Error | null }> {
  const { allowed, userRole, error: permError } = await checkProjectPermission(
    supabase,
    projectId,
    userId,
    'editor'
  )

  if (permError) {
    return { data: null, error: permError }
  }

  if (!allowed) {
    return { data: null, error: permissionDeniedError('restoring a project', 'editor', userRole) }
  }

  const { data: project, error } = await supabase
    .from('projects')
    .update({ is_archived: false, updated_at: new Date().toISOString() })
    .eq('id', projectId)
    .select()
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return { data: null, error: new Error('Project not found') }
    }
    return { data: null, error: new Error(error.message) }
  }

  await supabase
    .from('studies')
    .update({ is_archived: false, updated_at: new Date().toISOString() })
    .eq('project_id', projectId)

  return { data: project, error: null }
}

export async function listArchivedProjects(
  supabase: SupabaseClientType,
  userId: string,
  organizationId?: string
): Promise<{ data: ProjectWithPermission[] | null; error: Error | null }> {
  const { data: memberships, error: memberError } = await supabase
    .from('organization_members')
    .select('organization_id, role')
    .eq('user_id', userId)
    .not('joined_at', 'is', null)

  if (memberError) {
    return { data: null, error: new Error(memberError.message) }
  }

  const orgIds = memberships?.map((m) => m.organization_id) || []

  if (orgIds.length === 0) {
    return { data: [], error: null }
  }

  const orgRolesMap = new Map<string, OrganizationRole>()
  for (const m of memberships || []) {
    orgRolesMap.set(m.organization_id, m.role as OrganizationRole)
  }

  const { data: projects, error } = await supabase
    .from('projects')
    .select(`
      *,
      studies(count)
    `)
    .in('organization_id', organizationId ? [organizationId] : orgIds)
    .eq('is_archived', true)
    .eq('studies.is_archived', false)
    .order('updated_at', { ascending: false })

  if (error) {
    return { data: null, error: new Error(error.message) }
  }

  if (!projects || projects.length === 0) {
    return { data: [], error: null }
  }

  const projectIds = projects.map((p) => p.id)
  const preloaded: PreloadedPermissionData = {
    projects: (projects as any[]).map((p) => ({
      id: p.id,
      organization_id: p.organization_id,
      user_id: p.user_id,
      visibility: p.visibility,
    })),
    orgRolesMap,
  }

  const { data: permissionsMap, error: permError } = await getProjectPermissionsBatch(
    supabase,
    projectIds,
    userId,
    preloaded
  )

  if (permError) {
    return { data: null, error: permError }
  }

  const projectsWithPermissions: ProjectWithPermission[] = ((projects || []) as unknown as Array<Record<string, unknown> & { id: string }>)
    .filter((p) => permissionsMap.has(p.id))
    .map((project) => {
      const permission = permissionsMap.get(project.id)
      const countResult = (project as any).studies as Array<{ count: number }>
      return {
        ...project,
        study_count: countResult?.[0]?.count ?? 0,
        user_role: permission?.role || 'viewer',
        permission_source: permission?.source || 'inherited',
      }
    }) as ProjectWithPermission[]

  return { data: projectsWithPermissions, error: null }
}
