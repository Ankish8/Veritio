/**
 * Panel Participant Service
 *
 * Business logic for managing panel participants (CRM).
 * Handles CRUD operations, filtering, searching, and bulk imports.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  PanelParticipant,
  PanelParticipantInsert,
  PanelParticipantUpdate,
  PanelParticipantWithTags,
  PanelParticipantWithDetails,
  PanelParticipantFilters,
  PaginationParams,
  ImportedParticipant,
  ImportResult,
  ImportDuplicateHandling,
  PanelTag,
} from '../../lib/supabase/panel-types'

export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}

export class PanelParticipantService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Get paginated list of participants with optional filters
   */
  async list(
    userId: string,
    organizationId: string,
    filters: PanelParticipantFilters = {},
    pagination: PaginationParams = {}
  ): Promise<PaginatedResult<PanelParticipantWithTags>> {
    const { page = 1, limit = 50, sort_by = 'created_at', sort_order = 'desc' } = pagination

    let query = this.supabase
      .from('panel_participants')
      .select(
        `
        *,
        panel_participant_tags!left (
          panel_tags (*)
        )
      `,
        { count: 'exact' }
      )
      .eq('organization_id', organizationId)

    // Apply filters
    if (filters.status) {
      const statuses = Array.isArray(filters.status) ? filters.status : [filters.status]
      query = query.in('status', statuses)
    }

    if (filters.source) {
      const sources = Array.isArray(filters.source) ? filters.source : [filters.source]
      query = query.in('source', sources)
    }

    if (filters.search) {
      const search = `%${filters.search}%`
      query = query.or(`email.ilike.${search},first_name.ilike.${search},last_name.ilike.${search}`)
    }

    if (filters.last_active_after) {
      query = query.gte('last_active_at', filters.last_active_after)
    }

    if (filters.last_active_before) {
      query = query.lte('last_active_at', filters.last_active_before)
    }

    if (filters.created_after) {
      query = query.gte('created_at', filters.created_after)
    }

    if (filters.created_before) {
      query = query.lte('created_at', filters.created_before)
    }

    // Filter by tag_id using subquery on junction table
    if (filters.tag_id) {
      const { data: taggedIds } = await this.supabase
        .from('panel_participant_tags')
        .select('panel_participant_id')
        .eq('panel_tag_id', filters.tag_id)

      const ids = (taggedIds || []).map((t) => t.panel_participant_id)
      if (ids.length === 0) {
        // No participants have this tag — return empty result
        return { data: [], total: 0, page, limit, hasMore: false }
      }
      query = query.in('id', ids)
    }

    // Apply sorting and pagination
    const offset = (page - 1) * limit
    query = query
      .order(sort_by, { ascending: sort_order === 'asc' })
      .range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) throw error

    // Transform to include tags array
    const participants = (data || []).map((p) => {
      const tags = (p.panel_participant_tags || [])
        .map((pt: { panel_tags: PanelTag | null }) => pt.panel_tags)
        .filter(Boolean) as PanelTag[]
      const { panel_participant_tags: _tags, ...participant } = p
      return { ...participant, tags } as PanelParticipantWithTags
    })

    // Batch fetch study counts for all participants on this page
    const participantIds = participants.map((p) => p.id)
    if (participantIds.length > 0) {
      const { data: participations } = await this.supabase
        .from('panel_study_participations')
        .select('panel_participant_id')
        .in('panel_participant_id', participantIds)

      // Count participations per participant
      const countMap = new Map<string, number>()
      participations?.forEach((p) => {
        const current = countMap.get(p.panel_participant_id) || 0
        countMap.set(p.panel_participant_id, current + 1)
      })

      // Merge counts into participants
      participants.forEach((p) => {
        p.study_count = countMap.get(p.id) || 0
      })
    }

    return {
      data: participants,
      total: count || 0,
      page,
      limit,
      hasMore: offset + participants.length < (count || 0),
    }
  }

  /**
   * Get a single participant by ID with full details
   */
  async get(userId: string, organizationId: string, participantId: string): Promise<PanelParticipantWithDetails | null> {
    // Run all queries in parallel for better performance
    const [participantResult, participationsResult, distributionsResult] = await Promise.all([
      // Get participant with tags
      this.supabase
        .from('panel_participants')
        .select(
          `
          *,
          panel_participant_tags!left (
            panel_tags (*)
          )
        `
        )
        .eq('id', participantId)
        .eq('organization_id', organizationId)
        .single(),

      // Get study participations
      this.supabase
        .from('panel_study_participations')
        .select('id, status')
        .eq('panel_participant_id', participantId),

      // Get incentive distributions
      this.supabase
        .from('panel_incentive_distributions')
        .select('amount, currency')
        .eq('panel_participant_id', participantId)
        .in('status', ['sent', 'redeemed']),
    ])

    const { data: participant, error } = participantResult

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }

    const participations = participationsResult.data
    const distributions = distributionsResult.data

    const studyCount = participations?.length || 0
    const completedCount = participations?.filter((p) => p.status === 'completed').length || 0
    const completionRate = studyCount > 0 ? (completedCount / studyCount) * 100 : 0

    // Sum incentives (simplified - assumes same currency)
    const totalIncentives = distributions?.reduce((sum, d) => sum + (d.amount || 0), 0) || 0

    // Transform tags
    const tags = (participant.panel_participant_tags || [])
      .map((pt: { panel_tags: PanelTag | null }) => pt.panel_tags)
      .filter(Boolean) as PanelTag[]

    const { panel_participant_tags: _tags, ...rest } = participant

    return {
      ...rest,
      tags,
      study_count: studyCount,
      completion_rate: Math.round(completionRate * 100) / 100,
      total_incentives_earned: totalIncentives,
    } as PanelParticipantWithDetails
  }

  /**
   * Find participant by email
   */
  async findByEmail(userId: string, organizationId: string, email: string): Promise<PanelParticipant | null> {
    const { data, error } = await this.supabase
      .from('panel_participants')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('email', email.toLowerCase())
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }

    return data
  }

  /**
   * Create a new participant
   */
  async create(userId: string, organizationId: string, input: PanelParticipantInsert): Promise<PanelParticipant> {
    const { data, error } = await this.supabase
      .from('panel_participants')
      .insert({
        ...input,
        user_id: userId,
        organization_id: organizationId,
        email: input.email.toLowerCase(),
        status: input.status || 'active',
        source: input.source || 'manual',
        demographics: input.demographics || {},
        custom_attributes: input.custom_attributes || {},
        source_details: input.source_details || {},
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Update a participant
   */
  async update(
    userId: string,
    organizationId: string,
    participantId: string,
    input: PanelParticipantUpdate
  ): Promise<PanelParticipant> {
    const updates: Record<string, unknown> = {}
    Object.entries(input).forEach(([key, value]) => {
      if (value !== undefined) {
        updates[key] = key === 'email' && typeof value === 'string' ? value.toLowerCase() : value
      }
    })

    const { data, error } = await this.supabase
      .from('panel_participants')
      .update(updates)
      .eq('id', participantId)
      .eq('organization_id', organizationId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Delete a participant (hard delete)
   */
  async delete(userId: string, organizationId: string, participantId: string): Promise<void> {
    const { error } = await this.supabase
      .from('panel_participants')
      .delete()
      .eq('id', participantId)
      .eq('organization_id', organizationId)

    if (error) throw error
  }

  /**
   * Bulk delete participants
   */
  async bulkDelete(userId: string, organizationId: string, participantIds: string[]): Promise<number> {
    const { data, error } = await this.supabase
      .from('panel_participants')
      .delete()
      .eq('organization_id', organizationId)
      .in('id', participantIds)
      .select('id')

    if (error) throw error
    return data?.length || 0
  }

  /**
   * Update last active timestamp
   */
  async updateLastActive(participantId: string): Promise<void> {
    const { error } = await this.supabase
      .from('panel_participants')
      .update({ last_active_at: new Date().toISOString() })
      .eq('id', participantId)

    if (error) throw error
  }

  /**
   * Get or create participant by email
   * Used when widget captures participant or they complete a study
   */
  async getOrCreate(
    userId: string,
    organizationId: string,
    email: string,
    defaults: Partial<PanelParticipantInsert> = {}
  ): Promise<{ participant: PanelParticipant; created: boolean }> {
    // First try to find existing
    const existing = await this.findByEmail(userId, organizationId, email)
    if (existing) {
      return { participant: existing, created: false }
    }

    // Create new participant
    const participant = await this.create(userId, organizationId, {
      email,
      ...defaults,
    })

    return { participant, created: true }
  }

  /**
   * Bulk import participants
   */
  async bulkImport(
    userId: string,
    organizationId: string,
    participants: ImportedParticipant[],
    options: {
      duplicateHandling: ImportDuplicateHandling
      autoCreateTags: boolean
      defaultTagId?: string
    }
  ): Promise<ImportResult> {
    const result: ImportResult = {
      total: participants.length,
      created: 0,
      updated: 0,
      failed: 0,
      errors: [],
    }

    // Get all existing participants by email for duplicate detection
    const emails = participants.map((p) => p.email.toLowerCase())
    const { data: existingParticipants } = await this.supabase
      .from('panel_participants')
      .select('id, email')
      .eq('organization_id', organizationId)
      .in('email', emails)

    const existingByEmail = new Map(existingParticipants?.map((p) => [p.email, p.id]) || [])

    // Get or create tags if needed
    const tagNameToId = new Map<string, string>()
    if (options.autoCreateTags) {
      const allTagNames = new Set<string>()
      participants.forEach((p) => p.tags?.forEach((t) => allTagNames.add(t)))

      if (allTagNames.size > 0) {
        // Get existing tags
        const { data: existingTags } = await this.supabase
          .from('panel_tags')
          .select('id, name')
          .eq('organization_id', organizationId)
          .in('name', [...allTagNames])

        existingTags?.forEach((t) => tagNameToId.set(t.name, t.id))

        // Create missing tags
        const missingTags = [...allTagNames].filter((name) => !tagNameToId.has(name))
        if (missingTags.length > 0) {
          const { data: newTags } = await this.supabase
            .from('panel_tags')
            .insert(missingTags.map((name) => ({ user_id: userId, organization_id: organizationId, name })))
            .select('id, name')

          newTags?.forEach((t) => tagNameToId.set(t.name, t.id))
        }
      }
    }

    // Process each participant
    for (let i = 0; i < participants.length; i++) {
      const row = i + 1
      const p = participants[i]

      try {
        const existingId = existingByEmail.get(p.email.toLowerCase())

        if (existingId) {
          // Handle duplicate
          if (options.duplicateHandling === 'skip') {
            // Skip silently
            continue
          } else if (options.duplicateHandling === 'update') {
            // Full update
            await this.update(userId, organizationId, existingId, {
              first_name: p.first_name || null,
              last_name: p.last_name || null,
              demographics: p.demographics || {},
              custom_attributes: p.custom_attributes || {},
            })
            result.updated++
          } else if (options.duplicateHandling === 'merge') {
            // Merge: only update non-null values
            const updates: PanelParticipantUpdate = {}
            if (p.first_name) updates.first_name = p.first_name
            if (p.last_name) updates.last_name = p.last_name
            if (p.demographics) updates.demographics = p.demographics
            if (p.custom_attributes) updates.custom_attributes = p.custom_attributes

            if (Object.keys(updates).length > 0) {
              await this.update(userId, organizationId, existingId, updates)
            }
            result.updated++
          }

          // Assign tags to existing
          await this.assignTagsToParticipant(userId, existingId, p.tags || [], tagNameToId, options.defaultTagId)
        } else {
          // Create new
          const newParticipant = await this.create(userId, organizationId, {
            email: p.email,
            first_name: p.first_name,
            last_name: p.last_name,
            source: 'import',
            demographics: p.demographics,
            custom_attributes: p.custom_attributes,
          })

          // Assign tags
          await this.assignTagsToParticipant(userId, newParticipant.id, p.tags || [], tagNameToId, options.defaultTagId)

          result.created++
        }
      } catch (err) {
        result.failed++
        result.errors.push({
          row,
          email: p.email,
          error: err instanceof Error ? err.message : 'Unknown error',
        })
      }
    }

    return result
  }

  /**
   * Helper to assign tags to a participant during import
   */
  private async assignTagsToParticipant(
    userId: string,
    participantId: string,
    tagNames: string[],
    tagNameToId: Map<string, string>,
    defaultTagId?: string
  ): Promise<void> {
    const tagIds = new Set<string>()

    // Add default tag if specified
    if (defaultTagId) {
      tagIds.add(defaultTagId)
    }

    // Add tags by name
    tagNames.forEach((name) => {
      const id = tagNameToId.get(name)
      if (id) tagIds.add(id)
    })

    if (tagIds.size === 0) return

    // Insert tag assignments (ignore conflicts)
    const assignments = [...tagIds].map((panel_tag_id) => ({
      panel_participant_id: participantId,
      panel_tag_id,
      source: 'import' as const,
    }))

    await this.supabase.from('panel_participant_tags').upsert(assignments, {
      onConflict: 'panel_participant_id,panel_tag_id',
      ignoreDuplicates: true,
    })
  }

  /**
   * Get participant counts by status
   */
  async getStatusCounts(userId: string, organizationId: string): Promise<Record<string, number>> {
    const { data, error } = await this.supabase
      .from('panel_participants')
      .select('status')
      .eq('organization_id', organizationId)

    if (error) throw error

    const counts: Record<string, number> = {
      active: 0,
      inactive: 0,
      blacklisted: 0,
      total: data?.length || 0,
    }

    data?.forEach((p) => {
      counts[p.status] = (counts[p.status] || 0) + 1
    })

    return counts
  }

  /**
   * Get count of participants who signed up within the last N days,
   * optionally after a "last viewed" timestamp (for mark-as-read badge).
   * The effective cutoff is GREATEST(sinceTimestamp, NOW() - days).
   */
  async getRecentSignupCount(userId: string, organizationId: string, days: number = 7, sinceTimestamp?: string | null): Promise<number> {
    const maxAgeCutoff = new Date()
    maxAgeCutoff.setDate(maxAgeCutoff.getDate() - days)

    // Use the later of the two cutoffs
    let cutoff = maxAgeCutoff
    if (sinceTimestamp) {
      const viewedAt = new Date(sinceTimestamp)
      if (viewedAt > maxAgeCutoff) {
        cutoff = viewedAt
      }
    }

    const { count, error } = await this.supabase
      .from('panel_participants')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .gte('created_at', cutoff.toISOString())

    if (error) throw error

    return count ?? 0
  }

  /**
   * Get participants matching a segment's conditions
   */
  async getBySegmentConditions(
    userId: string,
    organizationId: string,
    conditions: Array<{ field: string; operator: string; value: unknown }>,
    pagination: PaginationParams = {}
  ): Promise<PaginatedResult<PanelParticipant>> {
    const { page = 1, limit = 50 } = pagination

    let query = this.supabase
      .from('panel_participants')
      .select('*', { count: 'exact' })
      .eq('organization_id', organizationId)

    for (const condition of conditions) {
      const { field, operator, value } = condition

      // Handle different field types
      if (field.startsWith('demographics.')) {
        const demoField = field.replace('demographics.', '')
        switch (operator) {
          case 'equals':
            query = query.eq(`demographics->>${demoField}`, value)
            break
          case 'not_equals':
            query = query.neq(`demographics->>${demoField}`, value)
            break
          case 'contains':
            query = query.ilike(`demographics->>${demoField}`, `%${value}%`)
            break
        }
      } else if (field.startsWith('custom_attributes.')) {
        const attrField = field.replace('custom_attributes.', '')
        switch (operator) {
          case 'equals':
            query = query.eq(`custom_attributes->>${attrField}`, value)
            break
          case 'not_equals':
            query = query.neq(`custom_attributes->>${attrField}`, value)
            break
        }
      } else {
        // Regular field
        switch (operator) {
          case 'equals':
            query = query.eq(field, value)
            break
          case 'not_equals':
            query = query.neq(field, value)
            break
          case 'contains':
            query = query.ilike(field, `%${value}%`)
            break
          case 'in':
            query = query.in(field, value as unknown[])
            break
        }
      }
    }

    const offset = (page - 1) * limit
    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) throw error

    return {
      data: data || [],
      total: count || 0,
      page,
      limit,
      hasMore: offset + (data?.length || 0) < (count || 0),
    }
  }
}

export function createPanelParticipantService(supabase: SupabaseClient): PanelParticipantService {
  return new PanelParticipantService(supabase)
}
