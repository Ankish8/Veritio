import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@veritio/study-types'
import type {
  StudyTag,
  StudyTagWithCount,
  StudyTagAssignment,
  CreateStudyTagInput,
  UpdateStudyTagInput,
} from '../types/study-tags'
import { checkOrganizationPermission, getStudyPermission } from './permission-service'

type SupabaseClientType = SupabaseClient<Database>

export async function listStudyTags(
  supabase: SupabaseClientType,
  organizationId: string,
  userId: string
): Promise<{ data: StudyTagWithCount[] | null; error: Error | null }> {
  const { allowed, error: permError } = await checkOrganizationPermission(
    supabase,
    organizationId,
    userId,
    'viewer'
  )

  if (permError) {
    return { data: null, error: permError }
  }

  if (!allowed) {
    return { data: null, error: new Error('Not authorized to view organization tags') }
  }

  // study_tags table exists but isn't in generated types
  type TagWithAssignments = StudyTag & { study_tag_assignments: { count: number }[] }
  const { data: tags, error: queryError } = await (supabase as any)
    .from('study_tags')
    .select(`
      *,
      study_tag_assignments(count)
    `)
    .eq('organization_id', organizationId)
    .order('tag_group')
    .order('position')
    .order('name') as { data: TagWithAssignments[] | null; error: { message: string } | null }

  if (queryError) {
    return { data: null, error: new Error(queryError.message) }
  }

  const tagsWithCounts: StudyTagWithCount[] = (tags || []).map(tag => ({
    id: tag.id,
    organization_id: tag.organization_id,
    name: tag.name,
    color: tag.color,
    description: tag.description,
    tag_group: tag.tag_group as StudyTagWithCount['tag_group'],
    position: tag.position,
    created_by_user_id: tag.created_by_user_id,
    created_at: tag.created_at,
    updated_at: tag.updated_at,
    study_count: tag.study_tag_assignments?.[0]?.count || 0,
  }))

  return { data: tagsWithCounts, error: null }
}

export async function getStudyTag(
  supabase: SupabaseClientType,
  tagId: string,
  userId: string
): Promise<{ data: StudyTag | null; error: Error | null }> {
  // study_tags table exists but isn't in generated types
  const { data: tag, error: queryError } = await (supabase as any)
    .from('study_tags')
    .select('*')
    .eq('id', tagId)
    .single() as { data: StudyTag | null; error: { code?: string; message: string } | null }

  if (queryError) {
    if (queryError.code === 'PGRST116') {
      return { data: null, error: new Error('Tag not found') }
    }
    return { data: null, error: new Error(queryError.message) }
  }

  const { allowed, error: permError } = await checkOrganizationPermission(
    supabase,
    tag!.organization_id,
    userId,
    'viewer'
  )

  if (permError) {
    return { data: null, error: permError }
  }

  if (!allowed) {
    return { data: null, error: new Error('Not authorized to view this tag') }
  }

  return {
    data: {
      id: tag!.id,
      organization_id: tag!.organization_id,
      name: tag!.name,
      color: tag!.color,
      description: tag!.description,
      tag_group: tag!.tag_group as StudyTag['tag_group'],
      position: tag!.position,
      created_by_user_id: tag!.created_by_user_id,
      created_at: tag!.created_at,
      updated_at: tag!.updated_at,
    },
    error: null,
  }
}

export async function createStudyTag(
  supabase: SupabaseClientType,
  organizationId: string,
  userId: string,
  input: CreateStudyTagInput
): Promise<{ data: StudyTag | null; error: Error | null }> {
  const { allowed, error: permError } = await checkOrganizationPermission(
    supabase,
    organizationId,
    userId,
    'editor'
  )

  if (permError) {
    return { data: null, error: permError }
  }

  if (!allowed) {
    return { data: null, error: new Error('Not authorized to create tags in this organization') }
  }

  const { data: existing } = await (supabase as any)
    .from('study_tags')
    .select('id')
    .eq('organization_id', organizationId)
    .ilike('name', input.name)
    .single()

  if (existing) {
    return { data: null, error: new Error('A tag with this name already exists') }
  }

  let position = input.position
  if (position === undefined) {
    // study_tags table exists but isn't in generated types
    const { data: maxPos } = await (supabase as any)
      .from('study_tags')
      .select('position')
      .eq('organization_id', organizationId)
      .eq('tag_group', input.tag_group || 'custom')
      .order('position', { ascending: false })
      .limit(1)
      .single() as { data: { position: number } | null }

    position = (maxPos?.position ?? -1) + 1
  }

  const { data: tag, error: insertError } = await (supabase as any)
    .from('study_tags')
    .insert({
      organization_id: organizationId,
      name: input.name,
      color: input.color || '#6b7280',
      description: input.description ?? null,
      tag_group: input.tag_group || 'custom',
      position,
      created_by_user_id: userId,
    })
    .select()
    .single()

  if (insertError) {
    return { data: null, error: new Error(insertError.message) }
  }

  return {
    data: {
      id: tag.id,
      organization_id: tag.organization_id,
      name: tag.name,
      color: tag.color,
      description: tag.description,
      tag_group: tag.tag_group as StudyTag['tag_group'],
      position: tag.position,
      created_by_user_id: tag.created_by_user_id,
      created_at: tag.created_at,
      updated_at: tag.updated_at,
    },
    error: null,
  }
}

export async function updateStudyTag(
  supabase: SupabaseClientType,
  tagId: string,
  userId: string,
  input: UpdateStudyTagInput
): Promise<{ data: StudyTag | null; error: Error | null }> {
  const { data: existingTag, error: fetchError } = await (supabase as any)
    .from('study_tags')
    .select('*')
    .eq('id', tagId)
    .single()

  if (fetchError) {
    if (fetchError.code === 'PGRST116') {
      return { data: null, error: new Error('Tag not found') }
    }
    return { data: null, error: new Error(fetchError.message) }
  }

  const { allowed, error: permError } = await checkOrganizationPermission(
    supabase,
    existingTag.organization_id,
    userId,
    'editor'
  )

  if (permError) {
    return { data: null, error: permError }
  }

  if (!allowed) {
    return { data: null, error: new Error('Not authorized to update this tag') }
  }

  if (input.name && input.name !== existingTag.name) {
    const { data: duplicate } = await (supabase as any)
      .from('study_tags')
      .select('id')
      .eq('organization_id', existingTag.organization_id)
      .ilike('name', input.name)
      .neq('id', tagId)
      .single()

    if (duplicate) {
      return { data: null, error: new Error('A tag with this name already exists') }
    }
  }

  const updates: Record<string, unknown> = {}
  if (input.name !== undefined) updates.name = input.name
  if (input.color !== undefined) updates.color = input.color
  if (input.description !== undefined) updates.description = input.description
  if (input.tag_group !== undefined) updates.tag_group = input.tag_group
  if (input.position !== undefined) updates.position = input.position

  if (Object.keys(updates).length === 0) {
    // No changes, return existing
    return {
      data: {
        id: existingTag.id,
        organization_id: existingTag.organization_id,
        name: existingTag.name,
        color: existingTag.color,
        description: existingTag.description,
        tag_group: existingTag.tag_group as StudyTag['tag_group'],
        position: existingTag.position,
        created_by_user_id: existingTag.created_by_user_id,
        created_at: existingTag.created_at,
        updated_at: existingTag.updated_at,
      },
      error: null,
    }
  }

  const { data: tag, error: updateError } = await (supabase as any)
    .from('study_tags')
    .update(updates)
    .eq('id', tagId)
    .select()
    .single()

  if (updateError) {
    return { data: null, error: new Error(updateError.message) }
  }

  return {
    data: {
      id: tag.id,
      organization_id: tag.organization_id,
      name: tag.name,
      color: tag.color,
      description: tag.description,
      tag_group: tag.tag_group as StudyTag['tag_group'],
      position: tag.position,
      created_by_user_id: tag.created_by_user_id,
      created_at: tag.created_at,
      updated_at: tag.updated_at,
    },
    error: null,
  }
}

export async function deleteStudyTag(
  supabase: SupabaseClientType,
  tagId: string,
  userId: string
): Promise<{ error: Error | null }> {
  const { data: tag, error: fetchError } = await (supabase as any)
    .from('study_tags')
    .select('organization_id')
    .eq('id', tagId)
    .single()

  if (fetchError) {
    if (fetchError.code === 'PGRST116') {
      return { error: new Error('Tag not found') }
    }
    return { error: new Error(fetchError.message) }
  }

  const { allowed, error: permError } = await checkOrganizationPermission(
    supabase,
    tag.organization_id,
    userId,
    'admin'
  )

  if (permError) {
    return { error: permError }
  }

  if (!allowed) {
    return { error: new Error('Not authorized to delete this tag') }
  }

  const { error: deleteError } = await (supabase as any)
    .from('study_tags')
    .delete()
    .eq('id', tagId)

  if (deleteError) {
    return { error: new Error(deleteError.message) }
  }

  return { error: null }
}

export async function getTagsForStudy(
  supabase: SupabaseClientType,
  studyId: string,
  userId: string
): Promise<{ data: StudyTag[] | null; error: Error | null }> {
  const { data: permission, error: permError } = await getStudyPermission(
    supabase,
    studyId,
    userId
  )

  if (permError) {
    return { data: null, error: permError }
  }

  if (!permission) {
    return { data: null, error: new Error('Not authorized to view this study') }
  }

  const { data: assignments, error: queryError } = await (supabase as any)
    .from('study_tag_assignments')
    .select(`
      tag_id,
      study_tags (*)
    `)
    .eq('study_id', studyId)

  if (queryError) {
    return { data: null, error: new Error(queryError.message) }
  }

  type AssignmentWithTag = { tag_id: string; study_tags: StudyTag | null }
  const tags: StudyTag[] = ((assignments as AssignmentWithTag[] | null) || [])
    .map((a: AssignmentWithTag) => a.study_tags)
    .filter((tag): tag is StudyTag => Boolean(tag))
    .map((tag: StudyTag) => ({
      id: tag.id,
      organization_id: tag.organization_id,
      name: tag.name,
      color: tag.color,
      description: tag.description,
      tag_group: tag.tag_group,
      position: tag.position,
      created_by_user_id: tag.created_by_user_id,
      created_at: tag.created_at,
      updated_at: tag.updated_at,
    }))

  return { data: tags, error: null }
}

export async function setStudyTags(
  supabase: SupabaseClientType,
  studyId: string,
  tagIds: string[],
  userId: string
): Promise<{ data: StudyTag[] | null; error: Error | null }> {
  const { data: permission, error: permError } = await getStudyPermission(
    supabase,
    studyId,
    userId
  )

  if (permError) {
    return { data: null, error: permError }
  }

  if (!permission || !['owner', 'admin', 'editor'].includes(permission.role)) {
    return { data: null, error: new Error('Not authorized to modify study tags') }
  }

  if (tagIds.length > 0) {
    type TagWithOrg = { id: string; organization_id: string }
    const { data: tags, error: tagsError } = await (supabase as any)
      .from('study_tags')
      .select('id, organization_id')
      .in('id', tagIds) as { data: TagWithOrg[] | null; error: { message: string } | null }

    if (tagsError) {
      return { data: null, error: new Error(tagsError.message) }
    }

    if (!tags || tags.length !== tagIds.length) {
      return { data: null, error: new Error('One or more tags not found') }
    }

    const orgIds = new Set(tags.map((t) => t.organization_id))
    if (orgIds.size > 1 || (permission.organizationId && !orgIds.has(permission.organizationId))) {
      return { data: null, error: new Error('Tags must belong to the same organization as the study') }
    }
  }

  const { error: deleteError } = await (supabase as any)
    .from('study_tag_assignments')
    .delete()
    .eq('study_id', studyId)

  if (deleteError) {
    return { data: null, error: new Error(deleteError.message) }
  }

  if (tagIds.length > 0) {
    const assignments = tagIds.map(tagId => ({
      study_id: studyId,
      tag_id: tagId,
      assigned_by_user_id: userId,
    }))

    const { error: insertError } = await (supabase as any)
      .from('study_tag_assignments')
      .insert(assignments)

    if (insertError) {
      return { data: null, error: new Error(insertError.message) }
    }
  }

  return getTagsForStudy(supabase, studyId, userId)
}

export async function addTagToStudy(
  supabase: SupabaseClientType,
  studyId: string,
  tagId: string,
  userId: string
): Promise<{ data: StudyTagAssignment | null; error: Error | null }> {
  const { data: permission, error: permError } = await getStudyPermission(
    supabase,
    studyId,
    userId
  )

  if (permError) {
    return { data: null, error: permError }
  }

  if (!permission || !['owner', 'admin', 'editor'].includes(permission.role)) {
    return { data: null, error: new Error('Not authorized to modify study tags') }
  }

  const { data: tag, error: tagError } = await (supabase as any)
    .from('study_tags')
    .select('organization_id')
    .eq('id', tagId)
    .single()

  if (tagError) {
    if (tagError.code === 'PGRST116') {
      return { data: null, error: new Error('Tag not found') }
    }
    return { data: null, error: new Error(tagError.message) }
  }

  if (permission.organizationId && tag.organization_id !== permission.organizationId) {
    return { data: null, error: new Error('Tag does not belong to the study organization') }
  }

  const { error: insertError } = await (supabase as any)
    .from('study_tag_assignments')
    .upsert(
      {
        study_id: studyId,
        tag_id: tagId,
        assigned_by_user_id: userId,
      },
      {
        onConflict: 'study_id,tag_id',
        ignoreDuplicates: true,
      }
    )
    .select()
    .single()

  if (insertError && insertError.code !== 'PGRST116') {
    return { data: null, error: new Error(insertError.message) }
  }

  const { data: result, error: fetchError } = await (supabase as any)
    .from('study_tag_assignments')
    .select('*')
    .eq('study_id', studyId)
    .eq('tag_id', tagId)
    .single()

  if (fetchError) {
    return { data: null, error: new Error(fetchError.message) }
  }

  return {
    data: {
      id: result.id,
      study_id: result.study_id,
      tag_id: result.tag_id,
      assigned_at: result.assigned_at,
      assigned_by_user_id: result.assigned_by_user_id,
    },
    error: null,
  }
}

export async function removeTagFromStudy(
  supabase: SupabaseClientType,
  studyId: string,
  tagId: string,
  userId: string
): Promise<{ error: Error | null }> {
  const { data: permission, error: permError } = await getStudyPermission(
    supabase,
    studyId,
    userId
  )

  if (permError) {
    return { error: permError }
  }

  if (!permission || !['owner', 'admin', 'editor'].includes(permission.role)) {
    return { error: new Error('Not authorized to modify study tags') }
  }

  const { error: deleteError } = await (supabase as any)
    .from('study_tag_assignments')
    .delete()
    .eq('study_id', studyId)
    .eq('tag_id', tagId)

  if (deleteError) {
    return { error: new Error(deleteError.message) }
  }

  return { error: null }
}

export async function getTagsForStudiesBatch(
  supabase: SupabaseClientType,
  studyIds: string[]
): Promise<{ data: Map<string, StudyTag[]> | null; error: Error | null }> {
  if (studyIds.length === 0) {
    return { data: new Map(), error: null }
  }

  const { data: assignments, error: queryError } = await (supabase as any)
    .from('study_tag_assignments')
    .select(`
      study_id,
      study_tags (*)
    `)
    .in('study_id', studyIds)

  if (queryError) {
    return { data: null, error: new Error(queryError.message) }
  }

  const result = new Map<string, StudyTag[]>()

  for (const studyId of studyIds) {
    result.set(studyId, [])
  }

  for (const assignment of assignments || []) {
    const tag = assignment.study_tags as unknown as StudyTag
    if (tag) {
      const studyTags = result.get(assignment.study_id) || []
      studyTags.push({
        id: tag.id,
        organization_id: tag.organization_id,
        name: tag.name,
        color: tag.color,
        description: tag.description,
        tag_group: tag.tag_group,
        position: tag.position,
        created_by_user_id: tag.created_by_user_id,
        created_at: tag.created_at,
        updated_at: tag.updated_at,
      })
      result.set(assignment.study_id, studyTags)
    }
  }

  return { data: result, error: null }
}

export async function getStudiesWithTag(
  supabase: SupabaseClientType,
  tagId: string,
  organizationId: string,
  userId: string
): Promise<{ data: string[] | null; error: Error | null }> {
  const { allowed, error: permError } = await checkOrganizationPermission(
    supabase,
    organizationId,
    userId,
    'viewer'
  )

  if (permError) {
    return { data: null, error: permError }
  }

  if (!allowed) {
    return { data: null, error: new Error('Not authorized to view organization data') }
  }

  const { data: assignments, error: queryError } = await (supabase as any)
    .from('study_tag_assignments')
    .select('study_id')
    .eq('tag_id', tagId)

  if (queryError) {
    return { data: null, error: new Error(queryError.message) }
  }

  return {
    data: ((assignments || []) as Array<{ study_id: string }>).map((a) => a.study_id),
    error: null,
  }
}

export async function getTagStatistics(
  supabase: SupabaseClientType,
  organizationId: string,
  userId: string
): Promise<{
  data: {
    totalTags: number
    totalAssignments: number
    byGroup: Record<string, { count: number; assignmentCount: number }>
    mostUsed: Array<{ tagId: string; name: string; count: number }>
    unassigned: Array<{ tagId: string; name: string }>
  } | null
  error: Error | null
}> {
  const { data: tags, error } = await listStudyTags(supabase, organizationId, userId)

  if (error) {
    return { data: null, error }
  }

  if (!tags) {
    return { data: null, error: new Error('Failed to fetch tags') }
  }

  const totalTags = tags.length
  const totalAssignments = tags.reduce((sum, tag) => sum + tag.study_count, 0)

  const byGroup: Record<string, { count: number; assignmentCount: number }> = {}
  for (const tag of tags) {
    const group = tag.tag_group
    if (!byGroup[group]) {
      byGroup[group] = { count: 0, assignmentCount: 0 }
    }
    byGroup[group].count++
    byGroup[group].assignmentCount += tag.study_count
  }

  const mostUsed = tags
    .filter(t => t.study_count > 0)
    .sort((a, b) => b.study_count - a.study_count)
    .slice(0, 10)
    .map(t => ({ tagId: t.id, name: t.name, count: t.study_count }))

  const unassigned = tags
    .filter(t => t.study_count === 0)
    .map(t => ({ tagId: t.id, name: t.name }))

  return {
    data: {
      totalTags,
      totalAssignments,
      byGroup,
      mostUsed,
      unassigned,
    },
    error: null,
  }
}
