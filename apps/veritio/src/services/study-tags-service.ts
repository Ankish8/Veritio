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
import { studyTagsTable, studyTagAssignmentsTable } from '../lib/supabase/typed-tables'
import { isNotFound, dbError, notFound } from '../lib/supabase/result-utils'

type SupabaseClientType = SupabaseClient<Database>

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Map a raw DB row to a typed StudyTag. */
function mapTagRow(row: Record<string, unknown>): StudyTag {
  return {
    id: row.id as string,
    organization_id: row.organization_id as string,
    name: row.name as string,
    color: row.color as string,
    description: row.description as string | null,
    tag_group: row.tag_group as StudyTag['tag_group'],
    position: row.position as number,
    created_by_user_id: row.created_by_user_id as string | null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  }
}

/**
 * Assert that no other tag in the organisation shares the given name
 * (case-insensitive). Pass `excludeId` when updating an existing tag.
 */
async function assertTagNameUnique(
  supabase: SupabaseClientType,
  orgId: string,
  name: string,
  excludeId?: string
): Promise<Error | null> {
  let query = studyTagsTable(supabase)
    .select('id')
    .eq('organization_id', orgId)
    .ilike('name', name)

  if (excludeId) {
    query = query.neq('id', excludeId)
  }

  const { data: existing } = await query.single()
  if (existing) {
    return new Error('A tag with this name already exists')
  }
  return null
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

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

  if (permError) return { data: null, error: permError }
  if (!allowed) return { data: null, error: new Error('Not authorized to view organization tags') }

  type TagWithAssignments = StudyTag & { study_tag_assignments: { count: number }[] }
  const { data: tags, error: queryError } = await studyTagsTable(supabase)
    .select(`*, study_tag_assignments(count)`)
    .eq('organization_id', organizationId)
    .order('tag_group')
    .order('position')
    .order('name') as { data: TagWithAssignments[] | null; error: { message: string } | null }

  if (queryError) return dbError(queryError)

  const tagsWithCounts: StudyTagWithCount[] = (tags || []).map((tag) => ({
    ...mapTagRow(tag as unknown as Record<string, unknown>),
    study_count: tag.study_tag_assignments?.[0]?.count || 0,
  }))

  return { data: tagsWithCounts, error: null }
}

export async function getStudyTag(
  supabase: SupabaseClientType,
  tagId: string,
  userId: string
): Promise<{ data: StudyTag | null; error: Error | null }> {
  const { data: tag, error: queryError } = await studyTagsTable(supabase)
    .select('*')
    .eq('id', tagId)
    .single() as { data: Record<string, unknown> | null; error: { code?: string; message: string } | null }

  if (queryError) {
    if (isNotFound(queryError)) return notFound('Tag')
    return dbError(queryError)
  }

  const { allowed, error: permError } = await checkOrganizationPermission(
    supabase,
    tag!.organization_id as string,
    userId,
    'viewer'
  )

  if (permError) return { data: null, error: permError }
  if (!allowed) return { data: null, error: new Error('Not authorized to view this tag') }

  return { data: mapTagRow(tag!), error: null }
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

  if (permError) return { data: null, error: permError }
  if (!allowed) return { data: null, error: new Error('Not authorized to create tags in this organization') }

  const nameError = await assertTagNameUnique(supabase, organizationId, input.name)
  if (nameError) return { data: null, error: nameError }

  let position = input.position
  if (position === undefined) {
    const { data: maxPos } = await studyTagsTable(supabase)
      .select('position')
      .eq('organization_id', organizationId)
      .eq('tag_group', input.tag_group || 'custom')
      .order('position', { ascending: false })
      .limit(1)
      .single() as { data: { position: number } | null }

    position = (maxPos?.position ?? -1) + 1
  }

  const { data: tag, error: insertError } = await studyTagsTable(supabase)
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

  if (insertError) return dbError(insertError)

  return { data: mapTagRow(tag as unknown as Record<string, unknown>), error: null }
}

export async function updateStudyTag(
  supabase: SupabaseClientType,
  tagId: string,
  userId: string,
  input: UpdateStudyTagInput
): Promise<{ data: StudyTag | null; error: Error | null }> {
  const { data: existingTag, error: fetchError } = await studyTagsTable(supabase)
    .select('*')
    .eq('id', tagId)
    .single() as { data: Record<string, unknown> | null; error: { code?: string; message: string } | null }

  if (fetchError) {
    if (isNotFound(fetchError)) return notFound('Tag')
    return dbError(fetchError)
  }

  const { allowed, error: permError } = await checkOrganizationPermission(
    supabase,
    existingTag!.organization_id as string,
    userId,
    'editor'
  )

  if (permError) return { data: null, error: permError }
  if (!allowed) return { data: null, error: new Error('Not authorized to update this tag') }

  if (input.name && input.name !== existingTag!.name) {
    const nameError = await assertTagNameUnique(
      supabase,
      existingTag!.organization_id as string,
      input.name,
      tagId
    )
    if (nameError) return { data: null, error: nameError }
  }

  const updates: Record<string, unknown> = {}
  if (input.name !== undefined) updates.name = input.name
  if (input.color !== undefined) updates.color = input.color
  if (input.description !== undefined) updates.description = input.description
  if (input.tag_group !== undefined) updates.tag_group = input.tag_group
  if (input.position !== undefined) updates.position = input.position

  if (Object.keys(updates).length === 0) {
    return { data: mapTagRow(existingTag!), error: null }
  }

  const { data: tag, error: updateError } = await studyTagsTable(supabase)
    .update(updates)
    .eq('id', tagId)
    .select()
    .single()

  if (updateError) return dbError(updateError)

  return { data: mapTagRow(tag as unknown as Record<string, unknown>), error: null }
}

export async function deleteStudyTag(
  supabase: SupabaseClientType,
  tagId: string,
  userId: string
): Promise<{ error: Error | null }> {
  const { data: tag, error: fetchError } = await studyTagsTable(supabase)
    .select('organization_id')
    .eq('id', tagId)
    .single() as { data: { organization_id: string } | null; error: { code?: string; message: string } | null }

  if (fetchError) {
    if (isNotFound(fetchError)) return { error: new Error('Tag not found') }
    return { error: new Error(fetchError.message) }
  }

  const { allowed, error: permError } = await checkOrganizationPermission(
    supabase,
    tag!.organization_id,
    userId,
    'admin'
  )

  if (permError) return { error: permError }
  if (!allowed) return { error: new Error('Not authorized to delete this tag') }

  const { error: deleteError } = await studyTagsTable(supabase)
    .delete()
    .eq('id', tagId)

  if (deleteError) return { error: new Error(deleteError.message) }

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

  if (permError) return { data: null, error: permError }
  if (!permission) return { data: null, error: new Error('Not authorized to view this study') }

  const { data: assignments, error: queryError } = await studyTagAssignmentsTable(supabase)
    .select(`tag_id, study_tags (*)`)
    .eq('study_id', studyId)

  if (queryError) return dbError(queryError)

  type AssignmentWithTag = { tag_id: string; study_tags: Record<string, unknown> | null }
  const tags: StudyTag[] = ((assignments as unknown as AssignmentWithTag[]) || [])
    .map((a) => a.study_tags)
    .filter((tag): tag is Record<string, unknown> => Boolean(tag))
    .map(mapTagRow)

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

  if (permError) return { data: null, error: permError }
  if (!permission || !['owner', 'admin', 'editor'].includes(permission.role)) {
    return { data: null, error: new Error('Not authorized to modify study tags') }
  }

  if (tagIds.length > 0) {
    type TagWithOrg = { id: string; organization_id: string }
    const { data: tags, error: tagsError } = await studyTagsTable(supabase)
      .select('id, organization_id')
      .in('id', tagIds) as { data: TagWithOrg[] | null; error: { message: string } | null }

    if (tagsError) return dbError(tagsError)

    if (!tags || tags.length !== tagIds.length) {
      return { data: null, error: new Error('One or more tags not found') }
    }

    const orgIds = new Set(tags.map((t) => t.organization_id))
    if (orgIds.size > 1 || (permission.organizationId && !orgIds.has(permission.organizationId))) {
      return { data: null, error: new Error('Tags must belong to the same organization as the study') }
    }
  }

  const { error: deleteError } = await studyTagAssignmentsTable(supabase)
    .delete()
    .eq('study_id', studyId)

  if (deleteError) return dbError(deleteError)

  if (tagIds.length > 0) {
    const assignments = tagIds.map((tagId) => ({
      study_id: studyId,
      tag_id: tagId,
      assigned_by_user_id: userId,
    }))

    const { error: insertError } = await studyTagAssignmentsTable(supabase)
      .insert(assignments)

    if (insertError) return dbError(insertError)
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

  if (permError) return { data: null, error: permError }
  if (!permission || !['owner', 'admin', 'editor'].includes(permission.role)) {
    return { data: null, error: new Error('Not authorized to modify study tags') }
  }

  const { data: tag, error: tagError } = await studyTagsTable(supabase)
    .select('organization_id')
    .eq('id', tagId)
    .single() as { data: { organization_id: string } | null; error: { code?: string; message: string } | null }

  if (tagError) {
    if (isNotFound(tagError)) return notFound('Tag')
    return dbError(tagError)
  }

  if (permission.organizationId && tag!.organization_id !== permission.organizationId) {
    return { data: null, error: new Error('Tag does not belong to the study organization') }
  }

  const { error: insertError } = await studyTagAssignmentsTable(supabase)
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

  if (insertError && !isNotFound(insertError)) {
    return dbError(insertError)
  }

  const { data: result, error: fetchError } = await studyTagAssignmentsTable(supabase)
    .select('*')
    .eq('study_id', studyId)
    .eq('tag_id', tagId)
    .single()

  if (fetchError) return dbError(fetchError)

  const row = result as unknown as Record<string, string>
  return {
    data: {
      id: row.id,
      study_id: row.study_id,
      tag_id: row.tag_id,
      assigned_at: row.assigned_at,
      assigned_by_user_id: row.assigned_by_user_id,
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

  if (permError) return { error: permError }
  if (!permission || !['owner', 'admin', 'editor'].includes(permission.role)) {
    return { error: new Error('Not authorized to modify study tags') }
  }

  const { error: deleteError } = await studyTagAssignmentsTable(supabase)
    .delete()
    .eq('study_id', studyId)
    .eq('tag_id', tagId)

  if (deleteError) return { error: new Error(deleteError.message) }

  return { error: null }
}

export async function getTagsForStudiesBatch(
  supabase: SupabaseClientType,
  studyIds: string[]
): Promise<{ data: Map<string, StudyTag[]> | null; error: Error | null }> {
  if (studyIds.length === 0) {
    return { data: new Map(), error: null }
  }

  const { data: assignments, error: queryError } = await studyTagAssignmentsTable(supabase)
    .select(`study_id, study_tags (*)`)
    .in('study_id', studyIds)

  if (queryError) return dbError(queryError)

  const result = new Map<string, StudyTag[]>()
  for (const studyId of studyIds) {
    result.set(studyId, [])
  }

  for (const assignment of assignments || []) {
    const tag = (assignment as unknown as { study_id: string; study_tags: Record<string, unknown> | null }).study_tags
    if (tag) {
      const studyId = (assignment as unknown as { study_id: string }).study_id
      const studyTags = result.get(studyId) || []
      studyTags.push(mapTagRow(tag))
      result.set(studyId, studyTags)
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

  if (permError) return { data: null, error: permError }
  if (!allowed) return { data: null, error: new Error('Not authorized to view organization data') }

  const { data: assignments, error: queryError } = await studyTagAssignmentsTable(supabase)
    .select('study_id')
    .eq('tag_id', tagId)

  if (queryError) return dbError(queryError)

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

  if (error) return { data: null, error }
  if (!tags) return { data: null, error: new Error('Failed to fetch tags') }

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
    .filter((t) => t.study_count > 0)
    .sort((a, b) => b.study_count - a.study_count)
    .slice(0, 10)
    .map((t) => ({ tagId: t.id, name: t.name, count: t.study_count }))

  const unassigned = tags
    .filter((t) => t.study_count === 0)
    .map((t) => ({ tagId: t.id, name: t.name }))

  return {
    data: { totalTags, totalAssignments, byGroup, mostUsed, unassigned },
    error: null,
  }
}
