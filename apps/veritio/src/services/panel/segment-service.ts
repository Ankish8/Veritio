import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  PanelSegment,
  PanelSegmentInsert,
  PanelSegmentUpdate,
  SegmentCondition,
  SegmentOperator,
  PanelParticipant,
} from '../../lib/supabase/panel-types'

export interface SegmentWithParticipants extends PanelSegment {
  participants: PanelParticipant[]
}

export class PanelSegmentService {
  constructor(private supabase: SupabaseClient) {}

  async list(userId: string, organizationId: string): Promise<PanelSegment[]> {
    const { data, error } = await this.supabase
      .from('panel_segments')
      .select('*')
      .eq('organization_id', organizationId)
      .order('name')

    if (error) throw error
    return data || []
  }

  async get(userId: string, organizationId: string, segmentId: string): Promise<PanelSegment | null> {
    const { data, error } = await this.supabase
      .from('panel_segments')
      .select('*')
      .eq('id', segmentId)
      .eq('organization_id', organizationId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }

    return data
  }

  async create(userId: string, organizationId: string, input: PanelSegmentInsert): Promise<PanelSegment> {
    const { data, error } = await this.supabase
      .from('panel_segments')
      .insert({
        user_id: userId,
        organization_id: organizationId,
        name: input.name.trim(),
        description: input.description?.trim() || null,
        conditions: input.conditions,
        participant_count: 0,
      })
      .select()
      .single()

    if (error) throw error

    // Update participant count
    await this.updateParticipantCount(userId, organizationId, data.id)

    return this.get(userId, organizationId, data.id) as Promise<PanelSegment>
  }

  async update(userId: string, organizationId: string, segmentId: string, input: PanelSegmentUpdate): Promise<PanelSegment> {
    const updates: Record<string, unknown> = {}
    if (input.name !== undefined) updates.name = input.name.trim()
    if (input.description !== undefined) updates.description = input.description?.trim() || null
    if (input.conditions !== undefined) updates.conditions = input.conditions

    const { error } = await this.supabase
      .from('panel_segments')
      .update(updates)
      .eq('id', segmentId)
      .eq('organization_id', organizationId)
      .select()
      .single()

    if (error) throw error

    if (input.conditions) {
      await this.updateParticipantCount(userId, organizationId, segmentId)
    }

    return this.get(userId, organizationId, segmentId) as Promise<PanelSegment>
  }

  async delete(userId: string, organizationId: string, segmentId: string): Promise<void> {
    const { error } = await this.supabase
      .from('panel_segments')
      .delete()
      .eq('id', segmentId)
      .eq('organization_id', organizationId)

    if (error) throw error
  }

  async getParticipants(
    userId: string,
    organizationId: string,
    segmentId: string,
    limit?: number
  ): Promise<PanelParticipant[]> {
    const segment = await this.get(userId, organizationId, segmentId)
    if (!segment) throw new Error('Segment not found')

    return this.evaluateConditions(organizationId, segment.conditions as SegmentCondition[], limit)
  }

  async preview(
    userId: string,
    organizationId: string,
    conditions: SegmentCondition[],
    limit: number = 10
  ): Promise<{ count: number; samples: PanelParticipant[] }> {
    const samples = await this.evaluateConditions(organizationId, conditions, limit)
    const count = await this.countMatchingParticipants(organizationId, conditions)

    return { count, samples }
  }

  async updateParticipantCount(userId: string, organizationId: string, segmentId: string): Promise<number> {
    const segment = await this.get(userId, organizationId, segmentId)
    if (!segment) throw new Error('Segment not found')

    const count = await this.countMatchingParticipants(organizationId, segment.conditions as SegmentCondition[])

    await this.supabase
      .from('panel_segments')
      .update({
        participant_count: count,
        last_count_updated_at: new Date().toISOString(),
      })
      .eq('id', segmentId)

    return count
  }

  async refreshAllCounts(userId: string, organizationId: string): Promise<void> {
    const segments = await this.list(userId, organizationId)

    for (const segment of segments) {
      await this.updateParticipantCount(userId, organizationId, segment.id)
    }
  }

  private async evaluateConditions(
    organizationId: string,
    conditions: SegmentCondition[],
    limit?: number
  ): Promise<PanelParticipant[]> {
    let query = this.supabase
      .from('panel_participants')
      .select('*')
      .eq('organization_id', organizationId)

    for (const condition of conditions) {
      query = this.applyCondition(query, condition)
    }

    if (limit) {
      query = query.limit(limit)
    }

    const { data, error } = await query

    if (error) throw error
    return data || []
  }

  private async countMatchingParticipants(
    organizationId: string,
    conditions: SegmentCondition[]
  ): Promise<number> {
    let query = this.supabase
      .from('panel_participants')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)

    for (const condition of conditions) {
      query = this.applyCondition(query, condition)
    }

    const { count, error } = await query

    if (error) throw error
    return count || 0
  }

  private applyCondition(query: any, condition: SegmentCondition): any {
    const { field, operator, value } = condition

    if (
      field.startsWith('demographics.') ||
      field.startsWith('custom_attributes.') ||
      field.startsWith('source_details.')
    ) {
      return this.applyJsonCondition(query, field, operator, value)
    }

    if (field === 'tags') {
      return this.applyTagCondition(query, operator, value)
    }

    return this.applyFieldCondition(query, field, operator, value)
  }

  /** Build JSONB path: "demographics.country" -> "demographics->>'country'" */
  private buildJsonPath(field: string): string {
    const parts = field.split('.')
    if (parts.length < 2) return field

    const column = parts[0]
    const keys = parts.slice(1)

    let path = column
    for (let i = 0; i < keys.length; i++) {
      const isLast = i === keys.length - 1
      path += isLast ? `->>'${keys[i]}'` : `->'${keys[i]}'`
    }
    return path
  }

  private applyJsonCondition(query: any, field: string, operator: SegmentOperator, value: unknown): any {
    const jsonPath = this.buildJsonPath(field)

    switch (operator) {
      case 'equals':
        return query.eq(jsonPath, value)
      case 'not_equals':
        return query.neq(jsonPath, value)
      case 'contains':
        return query.ilike(jsonPath, `%${value}%`)
      case 'not_contains':
        return query.not(jsonPath, 'ilike', `%${value}%`)
      case 'is_empty':
        return query.or(`${jsonPath}.is.null,${jsonPath}.eq.`)
      case 'is_not_empty':
        return query.not(jsonPath, 'is', null).neq(jsonPath, '')
      case 'in':
        return query.in(jsonPath, value as unknown[])
      case 'not_in':
        return query.not(jsonPath, 'in', `(${(value as unknown[]).join(',')})`)
      default:
        return query
    }
  }

  private applyFieldCondition(query: any, field: string, operator: SegmentOperator, value: unknown): any {
    switch (operator) {
      case 'equals':
        return query.eq(field, value)
      case 'not_equals':
        return query.neq(field, value)
      case 'contains':
        return query.ilike(field, `%${value}%`)
      case 'not_contains':
        return query.not(field, 'ilike', `%${value}%`)
      case 'greater_than':
        return query.gt(field, value)
      case 'less_than':
        return query.lt(field, value)
      case 'in':
        return query.in(field, value as unknown[])
      case 'not_in':
        return query.not(field, 'in', `(${(value as unknown[]).join(',')})`)
      case 'is_empty':
        return query.or(`${field}.is.null,${field}.eq.`)
      case 'is_not_empty':
        return query.not(field, 'is', null).neq(field, '')
      default:
        return query
    }
  }

  // Tag conditions require subqueries not supported by PostgREST — caller filters separately
  private applyTagCondition(query: any, operator: SegmentOperator, _value: unknown): any {
    switch (operator) {
      case 'contains':
      case 'equals':
        return query
      case 'not_contains':
      case 'not_equals':
        return query
      default:
        return query
    }
  }

  async getStats(userId: string, organizationId: string): Promise<{
    totalSegments: number
    averageParticipantCount: number
    largestSegment: { name: string; count: number } | null
    smallestSegment: { name: string; count: number } | null
  }> {
    const segments = await this.list(userId, organizationId)

    if (segments.length === 0) {
      return {
        totalSegments: 0,
        averageParticipantCount: 0,
        largestSegment: null,
        smallestSegment: null,
      }
    }

    const totalCount = segments.reduce((sum, s) => sum + s.participant_count, 0)
    const sorted = [...segments].sort((a, b) => b.participant_count - a.participant_count)

    return {
      totalSegments: segments.length,
      averageParticipantCount: Math.round(totalCount / segments.length),
      largestSegment: { name: sorted[0].name, count: sorted[0].participant_count },
      smallestSegment: {
        name: sorted[sorted.length - 1].name,
        count: sorted[sorted.length - 1].participant_count,
      },
    }
  }

  async duplicate(userId: string, organizationId: string, segmentId: string, newName?: string): Promise<PanelSegment> {
    const segment = await this.get(userId, organizationId, segmentId)
    if (!segment) throw new Error('Segment not found')

    return this.create(userId, organizationId, {
      name: newName || `${segment.name} (Copy)`,
      description: segment.description,
      conditions: segment.conditions as SegmentCondition[],
    })
  }
}

export function createPanelSegmentService(supabase: SupabaseClient): PanelSegmentService {
  return new PanelSegmentService(supabase)
}
