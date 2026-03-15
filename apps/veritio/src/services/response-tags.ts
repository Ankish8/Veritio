import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  ResponseTag,
  ResponseTagAssignment,
  ResponseTagWithCount,
  CreateTagInput,
  UpdateTagInput,
  AssignTagInput,
  BulkAssignTagInput,
} from '../types/response-tags'

export class ResponseTagsService {
  constructor(private supabase: SupabaseClient) {}

  async getTagsForStudy(studyId: string): Promise<ResponseTagWithCount[]> {
    const { data: tags, error } = await this.supabase
      .from('response_tags')
      .select(`
        *,
        response_tag_assignments(count)
      `)
      .eq('study_id', studyId)
      .order('name')

    if (error) throw error

    return (tags || []).map(tag => ({
      ...tag,
      assignment_count: tag.response_tag_assignments?.[0]?.count || 0,
    }))
  }

  async getTag(tagId: string): Promise<ResponseTag | null> {
    const { data, error } = await this.supabase
      .from('response_tags')
      .select('*')
      .eq('id', tagId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }

    return data
  }

  async createTag(
    studyId: string,
    input: CreateTagInput,
    userId?: string
  ): Promise<ResponseTag> {
    const { data, error } = await this.supabase
      .from('response_tags')
      .insert({
        study_id: studyId,
        name: input.name,
        color: input.color,
        description: input.description || null,
        created_by: userId || null,
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  async updateTag(tagId: string, input: UpdateTagInput): Promise<ResponseTag> {
    const updates: Record<string, unknown> = {}
    if (input.name !== undefined) updates.name = input.name
    if (input.color !== undefined) updates.color = input.color
    if (input.description !== undefined) updates.description = input.description

    const { data, error } = await this.supabase
      .from('response_tags')
      .update(updates)
      .eq('id', tagId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async deleteTag(tagId: string): Promise<void> {
    const { error } = await this.supabase
      .from('response_tags')
      .delete()
      .eq('id', tagId)

    if (error) throw error
  }

  async getTagsForResponse(responseId: string): Promise<ResponseTag[]> {
    const { data, error } = await this.supabase
      .from('response_tag_assignments')
      .select(`
        tag_id,
        response_tags (*)
      `)
      .eq('response_id', responseId)

    if (error) throw error

    return (data || [])
      .map(assignment => assignment.response_tags)
      .filter(Boolean) as unknown as ResponseTag[]
  }

  async getResponsesWithTag(tagId: string): Promise<string[]> {
    const { data, error } = await this.supabase
      .from('response_tag_assignments')
      .select('response_id')
      .eq('tag_id', tagId)

    if (error) throw error

    return (data || []).map(a => a.response_id)
  }

  async assignTag(input: AssignTagInput, userId?: string): Promise<ResponseTagAssignment> {
    const { data, error } = await this.supabase
      .from('response_tag_assignments')
      .insert({
        tag_id: input.tag_id,
        response_id: input.response_id,
        response_type: input.response_type,
        assigned_by: userId || null,
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  async removeTag(tagId: string, responseId: string): Promise<void> {
    const { error } = await this.supabase
      .from('response_tag_assignments')
      .delete()
      .eq('tag_id', tagId)
      .eq('response_id', responseId)

    if (error) throw error
  }

  async bulkAssignTag(input: BulkAssignTagInput, userId?: string): Promise<number> {
    const assignments = input.response_ids.map(responseId => ({
      tag_id: input.tag_id,
      response_id: responseId,
      response_type: input.response_type,
      assigned_by: userId || null,
    }))

    const { data, error } = await this.supabase
      .from('response_tag_assignments')
      .upsert(assignments, {
        onConflict: 'tag_id,response_id',
        ignoreDuplicates: true,
      })
      .select()

    if (error) throw error
    return data?.length || 0
  }

  async bulkRemoveTag(tagId: string, responseIds: string[]): Promise<number> {
    const { data, error } = await this.supabase
      .from('response_tag_assignments')
      .delete()
      .eq('tag_id', tagId)
      .in('response_id', responseIds)
      .select()

    if (error) throw error
    return data?.length || 0
  }

  async getTagStats(studyId: string): Promise<{
    totalTags: number
    totalAssignments: number
    tagDistribution: { tagId: string; name: string; count: number }[]
  }> {
    const tags = await this.getTagsForStudy(studyId)

    const totalTags = tags.length
    const totalAssignments = tags.reduce((sum, tag) => sum + tag.assignment_count, 0)
    const tagDistribution = tags
      .map(tag => ({
        tagId: tag.id,
        name: tag.name,
        count: tag.assignment_count,
      }))
      .sort((a, b) => b.count - a.count)

    return { totalTags, totalAssignments, tagDistribution }
  }
}

export function createResponseTagsService(supabase: SupabaseClient): ResponseTagsService {
  return new ResponseTagsService(supabase)
}
