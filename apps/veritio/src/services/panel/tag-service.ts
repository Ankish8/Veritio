import type { SupabaseClient } from '@supabase/supabase-js'
import type { PanelTag, PanelTagInsert, PanelTagUpdate } from '../../lib/supabase/panel-types'

export interface PanelTagWithCount extends PanelTag {
  participant_count: number
}

export class PanelTagService {
  constructor(private supabase: SupabaseClient) {}

  async list(userId: string, organizationId: string): Promise<PanelTagWithCount[]> {
    const { data: tags, error } = await this.supabase
      .from('panel_tags')
      .select(
        `
        *,
        panel_participant_tags(count)
      `
      )
      .eq('organization_id', organizationId)
      .order('name')

    if (error) throw error

    return (tags || []).map((tag) => ({
      ...tag,
      participant_count: tag.panel_participant_tags?.[0]?.count || 0,
    }))
  }

  async get(userId: string, organizationId: string, tagId: string): Promise<PanelTag | null> {
    const { data, error } = await this.supabase
      .from('panel_tags')
      .select('*')
      .eq('id', tagId)
      .eq('organization_id', organizationId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }

    return data
  }

  async findByName(userId: string, organizationId: string, name: string): Promise<PanelTag | null> {
    const { data, error } = await this.supabase
      .from('panel_tags')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('name', name)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }

    return data
  }

  async create(userId: string, organizationId: string, input: PanelTagInsert): Promise<PanelTag> {
    const { data, error } = await this.supabase
      .from('panel_tags')
      .insert({
        user_id: userId,
        organization_id: organizationId,
        name: input.name.trim(),
        color: input.color || '#6b7280',
        description: input.description?.trim() || null,
        is_system: false,
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  async update(userId: string, organizationId: string, tagId: string, input: PanelTagUpdate): Promise<PanelTag> {
    const existing = await this.get(userId, organizationId, tagId)
    if (existing?.is_system) {
      throw new Error('Cannot modify system tags')
    }

    const updates: Record<string, unknown> = {}
    if (input.name !== undefined) updates.name = input.name.trim()
    if (input.color !== undefined) updates.color = input.color
    if (input.description !== undefined) updates.description = input.description?.trim() || null

    const { data, error } = await this.supabase
      .from('panel_tags')
      .update(updates)
      .eq('id', tagId)
      .eq('organization_id', organizationId)
      .eq('is_system', false)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async delete(userId: string, organizationId: string, tagId: string): Promise<void> {
    const existing = await this.get(userId, organizationId, tagId)
    if (existing?.is_system) {
      throw new Error('Cannot delete system tags')
    }

    const { error } = await this.supabase
      .from('panel_tags')
      .delete()
      .eq('id', tagId)
      .eq('organization_id', organizationId)
      .eq('is_system', false)

    if (error) throw error
  }

  async getOrCreate(userId: string, organizationId: string, name: string, color?: string): Promise<PanelTag> {
    const existing = await this.findByName(userId, organizationId, name)
    if (existing) return existing

    return this.create(userId, organizationId, { name, color })
  }

  /**
   * Create default system tags for a new org.
   * Called when org first accesses panel feature.
   */
  async createDefaultTags(userId: string, organizationId: string): Promise<PanelTag[]> {
    const defaultTags = [
      { name: 'Widget', color: '#22c55e', description: 'Captured via website widget' },
      { name: 'Import', color: '#3b82f6', description: 'Imported from CSV file' },
      { name: 'Manual', color: '#8b5cf6', description: 'Manually added' },
      { name: 'Link', color: '#f59e0b', description: 'Joined via direct link' },
      { name: 'Study', color: '#f97316', description: 'Completed a study' },
    ]

    const { data, error } = await this.supabase
      .from('panel_tags')
      .upsert(
        defaultTags.map((tag) => ({
          user_id: userId,
          organization_id: organizationId,
          name: tag.name,
          color: tag.color,
          description: tag.description,
          is_system: true,
        })),
        {
          onConflict: 'organization_id,name',
          ignoreDuplicates: true,
        }
      )
      .select()

    if (error) throw error
    return data || []
  }

  async getSystemTags(userId: string, organizationId: string): Promise<PanelTag[]> {
    const { data, error } = await this.supabase
      .from('panel_tags')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_system', true)
      .order('name')

    if (error) throw error
    return data || []
  }

  async getStats(userId: string, organizationId: string): Promise<{
    totalTags: number
    systemTags: number
    customTags: number
    totalAssignments: number
  }> {
    const tags = await this.list(userId, organizationId)

    const systemTags = tags.filter((t) => t.is_system).length
    const customTags = tags.filter((t) => !t.is_system).length
    const totalAssignments = tags.reduce((sum, t) => sum + t.participant_count, 0)

    return {
      totalTags: tags.length,
      systemTags,
      customTags,
      totalAssignments,
    }
  }
}

export function createPanelTagService(supabase: SupabaseClient): PanelTagService {
  return new PanelTagService(supabase)
}
