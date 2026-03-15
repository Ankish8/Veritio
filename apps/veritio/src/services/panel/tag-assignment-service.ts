/**
 * Panel Tag Assignment Service
 *
 * Business logic for managing tag assignments to participants.
 * Handles individual and bulk tag operations.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  PanelParticipantTag,
  PanelTag,
  TagAssignmentSource,
} from '../../lib/supabase/panel-types'

export class PanelTagAssignmentService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Get all tags for a participant
   */
  async getTagsForParticipant(participantId: string): Promise<PanelTag[]> {
    const { data, error } = await this.supabase
      .from('panel_participant_tags')
      .select(`
        panel_tags (*)
      `)
      .eq('panel_participant_id', participantId)

    if (error) throw error

    return (data || [])
      .map((d) => d.panel_tags)
      .filter(Boolean) as unknown as PanelTag[]
  }

  /**
   * Get all participants with a specific tag
   */
  async getParticipantsWithTag(tagId: string): Promise<string[]> {
    const { data, error } = await this.supabase
      .from('panel_participant_tags')
      .select('panel_participant_id')
      .eq('panel_tag_id', tagId)

    if (error) throw error
    return (data || []).map((d) => d.panel_participant_id)
  }

  /**
   * Assign a tag to a participant
   */
  async assignTag(
    participantId: string,
    tagId: string,
    source: TagAssignmentSource = 'manual'
  ): Promise<PanelParticipantTag> {
    const { data, error } = await this.supabase
      .from('panel_participant_tags')
      .insert({
        panel_participant_id: participantId,
        panel_tag_id: tagId,
        source,
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Remove a tag from a participant
   */
  async removeTag(participantId: string, tagId: string): Promise<void> {
    const { error } = await this.supabase
      .from('panel_participant_tags')
      .delete()
      .eq('panel_participant_id', participantId)
      .eq('panel_tag_id', tagId)

    if (error) throw error
  }

  /**
   * Bulk assign a tag to multiple participants
   */
  async bulkAssignTag(
    participantIds: string[],
    tagId: string,
    source: TagAssignmentSource = 'manual'
  ): Promise<number> {
    const assignments = participantIds.map((participantId) => ({
      panel_participant_id: participantId,
      panel_tag_id: tagId,
      source,
    }))

    const { data, error } = await this.supabase
      .from('panel_participant_tags')
      .upsert(assignments, {
        onConflict: 'panel_participant_id,panel_tag_id',
        ignoreDuplicates: true,
      })
      .select()

    if (error) throw error
    return data?.length || 0
  }

  /**
   * Bulk remove a tag from multiple participants
   */
  async bulkRemoveTag(participantIds: string[], tagId: string): Promise<number> {
    const { data, error } = await this.supabase
      .from('panel_participant_tags')
      .delete()
      .eq('panel_tag_id', tagId)
      .in('panel_participant_id', participantIds)
      .select()

    if (error) throw error
    return data?.length || 0
  }

  /**
   * Replace all tags for a participant
   */
  async replaceParticipantTags(
    participantId: string,
    tagIds: string[],
    source: TagAssignmentSource = 'manual'
  ): Promise<void> {
    // Delete all existing tags
    const { error: deleteError } = await this.supabase
      .from('panel_participant_tags')
      .delete()
      .eq('panel_participant_id', participantId)

    if (deleteError) throw deleteError

    // Insert new tags
    if (tagIds.length > 0) {
      const assignments = tagIds.map((tagId) => ({
        panel_participant_id: participantId,
        panel_tag_id: tagId,
        source,
      }))

      const { error: insertError } = await this.supabase
        .from('panel_participant_tags')
        .insert(assignments)

      if (insertError) throw insertError
    }
  }

  /**
   * Get tag assignment history for a participant
   */
  async getAssignmentHistory(participantId: string): Promise<
    Array<{
      tag: PanelTag
      source: TagAssignmentSource
      assigned_at: string
    }>
  > {
    const { data, error } = await this.supabase
      .from('panel_participant_tags')
      .select(`
        source,
        assigned_at,
        panel_tags (*)
      `)
      .eq('panel_participant_id', participantId)
      .order('assigned_at', { ascending: false })

    if (error) throw error

    return (data || []).map((d) => ({
      tag: d.panel_tags as unknown as PanelTag,
      source: d.source as TagAssignmentSource,
      assigned_at: d.assigned_at,
    }))
  }

  /**
   * Check if participant has a specific tag
   */
  async hasTag(participantId: string, tagId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('panel_participant_tags')
      .select('panel_participant_id')
      .eq('panel_participant_id', participantId)
      .eq('panel_tag_id', tagId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return false
      throw error
    }

    return !!data
  }

  /**
   * Get participants with any of the specified tags
   */
  async getParticipantsWithAnyTag(tagIds: string[]): Promise<string[]> {
    const { data, error } = await this.supabase
      .from('panel_participant_tags')
      .select('panel_participant_id')
      .in('panel_tag_id', tagIds)

    if (error) throw error

    // Return unique participant IDs
    return [...new Set((data || []).map((d) => d.panel_participant_id))]
  }

  /**
   * Get participants with all of the specified tags
   */
  async getParticipantsWithAllTags(tagIds: string[]): Promise<string[]> {
    if (tagIds.length === 0) return []

    // Get participants that have ALL specified tags
    const { data, error } = await this.supabase
      .from('panel_participant_tags')
      .select('panel_participant_id, panel_tag_id')
      .in('panel_tag_id', tagIds)

    if (error) throw error

    // Group by participant and count
    const participantTagCounts = new Map<string, number>()
    for (const d of data || []) {
      const count = participantTagCounts.get(d.panel_participant_id) || 0
      participantTagCounts.set(d.panel_participant_id, count + 1)
    }

    // Return participants that have all tags
    return [...participantTagCounts.entries()]
      .filter(([_id, count]) => count === tagIds.length)
      .map(([id]) => id)
  }
}

export function createPanelTagAssignmentService(supabase: SupabaseClient): PanelTagAssignmentService {
  return new PanelTagAssignmentService(supabase)
}
