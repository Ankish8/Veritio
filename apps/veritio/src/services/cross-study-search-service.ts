import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@veritio/study-types'
import type {
  CrossStudySearchFilters,
  CrossStudySearchResult,
  CrossStudySearchResponse,
  SearchFacets,
  StudyTag,
} from '../types/study-tags'
import { checkOrganizationPermission } from './permission-service'

type SupabaseClientType = SupabaseClient<Database>

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 100

export interface SearchOptions {
  limit?: number
  cursor?: string
  includeFacets?: boolean
  sortBy?: 'relevance' | 'created_at' | 'updated_at' | 'title'
  sortOrder?: 'asc' | 'desc'
}

export async function searchStudies(
  supabase: SupabaseClientType,
  organizationId: string,
  userId: string,
  filters: CrossStudySearchFilters = {},
  options: SearchOptions = {}
): Promise<{ data: CrossStudySearchResponse | null; error: Error | null }> {
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
    return { data: null, error: new Error('Not authorized to search in this organization') }
  }

  const limit = Math.min(options.limit || DEFAULT_LIMIT, MAX_LIMIT)
  const sortBy = options.sortBy || 'updated_at'
  const sortOrder = options.sortOrder || 'desc'

  try {
    // Join through projects to filter by organization
    let query = supabase
      .from('studies')
      .select(`
        id, title, description, study_type, status, project_id,
        is_archived, created_at, updated_at,
        projects!inner (
          id, name, organization_id
        )
      `)
      .eq('projects.organization_id', organizationId)
      .eq('is_archived', false)

    if (filters.query?.trim()) {
      const searchTerm = `%${filters.query.trim()}%`
      query = query.or(`title.ilike.${searchTerm},description.ilike.${searchTerm}`)
    }

    if (filters.project_ids?.length) {
      query = query.in('project_id', filters.project_ids)
    }

    if (filters.study_types?.length) {
      query = query.in('study_type', filters.study_types)
    }

    if (filters.statuses?.length) {
      query = query.in('status', filters.statuses)
    }

    if (filters.date_range?.start) {
      query = query.gte('created_at', filters.date_range.start)
    }
    if (filters.date_range?.end) {
      query = query.lte('created_at', filters.date_range.end)
    }

    if (options.cursor) {
      const { data: cursorItem } = await supabase
        .from('studies')
        .select('id, created_at, updated_at, title')
        .eq('id', options.cursor)
        .single()

      if (cursorItem) {
        const cursorValue = cursorItem[sortBy as keyof typeof cursorItem]
        if (sortOrder === 'desc') {
          query = query.lt(sortBy, cursorValue)
        } else {
          query = query.gt(sortBy, cursorValue)
        }
      }
    }

    query = query.order(sortBy, { ascending: sortOrder === 'asc' })
    query = query.limit(limit + 1)

    const { data: studies, error: queryError } = await query

    if (queryError) {
      return { data: null, error: new Error(queryError.message) }
    }

    const hasMore = (studies?.length || 0) > limit
    const resultStudies = studies?.slice(0, limit) || []

    const studyIds = resultStudies.map(s => s.id)

    // Note: study_tag_assignments table exists but isn't in generated types
    const tagsMap = new Map<string, StudyTag[]>()
    if (studyIds.length > 0) {
      const { data: tagAssignments } = await (supabase as any)
        .from('study_tag_assignments')
        .select(`
          study_id,
          study_tags (*)
        `)
        .in('study_id', studyIds)

      for (const assignment of (tagAssignments || []) as { study_id: string; study_tags: any }[]) {
        const tag = assignment.study_tags as StudyTag
        if (tag) {
          const existing = tagsMap.get(assignment.study_id) || []
          existing.push({
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
          tagsMap.set(assignment.study_id, existing)
        }
      }
    }

    let filteredStudies = resultStudies
    if (filters.tag_ids?.length) {
      filteredStudies = resultStudies.filter(study => {
        const studyTags = tagsMap.get(study.id) || []
        return filters.tag_ids!.some(tagId => studyTags.some(t => t.id === tagId))
      })
    }

    const participantCountMap = new Map<string, number>()
    if (studyIds.length > 0) {
      const { data: participantCounts } = await supabase
        .from('participants')
        .select('study_id')
        .in('study_id', studyIds)
        .eq('status', 'completed')

      for (const p of participantCounts || []) {
        participantCountMap.set(p.study_id, (participantCountMap.get(p.study_id) || 0) + 1)
      }
    }

    if (filters.has_participants) {
      filteredStudies = filteredStudies.filter(s => (participantCountMap.get(s.id) || 0) > 0)
    }
    if (filters.min_participants !== undefined) {
      filteredStudies = filteredStudies.filter(
        s => (participantCountMap.get(s.id) || 0) >= filters.min_participants!
      )
    }

    const results: CrossStudySearchResult[] = filteredStudies.map(study => {
      const project = study.projects as unknown as { id: string; name: string }
      return {
        id: study.id,
        title: study.title,
        description: study.description,
        study_type: study.study_type,
        status: study.status || 'draft',
        project_id: study.project_id,
        project_name: project.name,
        participant_count: participantCountMap.get(study.id) || 0,
        created_at: study.created_at || new Date().toISOString(),
        updated_at: study.updated_at || new Date().toISOString(),
        tags: tagsMap.get(study.id) || [],
      }
    })

    let facets: SearchFacets | undefined
    if (options.includeFacets) {
      const facetsResult = await buildSearchFacets(supabase, organizationId, filters)
      if (facetsResult.data) {
        facets = facetsResult.data
      }
    }

    return {
      data: {
        results,
        total: results.length, // Note: Would need COUNT query for true total
        cursor: results.length > 0 ? results[results.length - 1].id : undefined,
        has_more: hasMore,
        facets,
      },
      error: null,
    }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error('Search failed') }
  }
}

export async function buildSearchFacets(
  supabase: SupabaseClientType,
  organizationId: string,
  _filters: CrossStudySearchFilters = {}
): Promise<{ data: SearchFacets | null; error: Error | null }> {
  try {
    // study_tag_assignments table exists but isn't in generated types
    const [tagCounts, typeCounts, statusCounts, projectCounts] = await Promise.all([
      (supabase as any)
        .from('study_tag_assignments')
        .select(`
          tag_id,
          study_tags!inner (id, name, organization_id)
        `)
        .eq('study_tags.organization_id', organizationId),

      supabase
        .from('studies')
        .select(`
          study_type,
          projects!inner (organization_id)
        `)
        .eq('projects.organization_id', organizationId)
        .eq('is_archived', false),

      supabase
        .from('studies')
        .select(`
          status,
          projects!inner (organization_id)
        `)
        .eq('projects.organization_id', organizationId)
        .eq('is_archived', false),

      supabase
        .from('studies')
        .select(`
          project_id,
          projects!inner (id, name, organization_id)
        `)
        .eq('projects.organization_id', organizationId)
        .eq('is_archived', false),
    ])

    const tagCountsMap = new Map<string, { name: string; count: number }>()
    for (const assignment of (tagCounts.data || []) as { tag_id: string; study_tags: { id: string; name: string } }[]) {
      const tag = assignment.study_tags
      if (tag) {
        const existing = tagCountsMap.get(assignment.tag_id)
        if (existing) {
          existing.count++
        } else {
          tagCountsMap.set(assignment.tag_id, { name: tag.name, count: 1 })
        }
      }
    }

    const typeCountsMap = new Map<string, number>()
    for (const study of typeCounts.data || []) {
      typeCountsMap.set(study.study_type, (typeCountsMap.get(study.study_type) || 0) + 1)
    }

    const statusCountsMap = new Map<string, number>()
    for (const study of statusCounts.data || []) {
      const status = study.status || 'draft'
      statusCountsMap.set(status, (statusCountsMap.get(status) || 0) + 1)
    }

    const projectCountsMap = new Map<string, { name: string; count: number }>()
    for (const study of projectCounts.data || []) {
      const project = study.projects as unknown as { id: string; name: string }
      if (project) {
        const existing = projectCountsMap.get(study.project_id)
        if (existing) {
          existing.count++
        } else {
          projectCountsMap.set(study.project_id, { name: project.name, count: 1 })
        }
      }
    }

    const facets: SearchFacets = {
      tag_counts: Array.from(tagCountsMap.entries()).map(([tag_id, { name, count }]) => ({
        tag_id,
        tag_name: name,
        count,
      })),
      type_counts: Array.from(typeCountsMap.entries()).map(([type, count]) => ({
        type,
        count,
      })),
      status_counts: Array.from(statusCountsMap.entries()).map(([status, count]) => ({
        status,
        count,
      })),
      project_counts: Array.from(projectCountsMap.entries()).map(([project_id, { name, count }]) => ({
        project_id,
        project_name: name,
        count,
      })),
    }

    return { data: facets, error: null }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error('Failed to build facets') }
  }
}

export async function quickSearch(
  supabase: SupabaseClientType,
  organizationId: string,
  userId: string,
  query: string,
  options: { limit?: number } = {}
): Promise<{
  data: {
    studies: Array<{ id: string; title: string; study_type: string }>
  } | null
  error: Error | null
}> {
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
    return { data: null, error: new Error('Not authorized') }
  }

  const limit = Math.min(options.limit || 5, 20)
  const searchTerm = `%${query.trim()}%`

  try {
    const { data: studies, error: studiesError } = await supabase
      .from('studies')
      .select(`
        id, title, study_type,
        projects!inner (organization_id)
      `)
      .eq('projects.organization_id', organizationId)
      .eq('is_archived', false)
      .ilike('title', searchTerm)
      .limit(limit)

    if (studiesError) {
      return { data: null, error: new Error(studiesError.message) }
    }

    return {
      data: {
        studies: (studies || []).map(s => ({
          id: s.id,
          title: s.title,
          study_type: s.study_type,
        })),
      },
      error: null,
    }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error('Quick search failed') }
  }
}

export async function getRecentStudies(
  supabase: SupabaseClientType,
  organizationId: string,
  userId: string,
  limit: number = 10
): Promise<{ data: CrossStudySearchResult[] | null; error: Error | null }> {
  const result = await searchStudies(supabase, organizationId, userId, {}, {
    limit,
    sortBy: 'updated_at',
    sortOrder: 'desc',
  })

  if (result.error) {
    return { data: null, error: result.error }
  }

  return { data: result.data?.results || [], error: null }
}

