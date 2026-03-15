/**
 * Panel Incentive Service
 *
 * Business logic for managing study incentive configurations and distributions.
 * Handles per-study incentive settings and payout tracking.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  StudyIncentiveConfig,
  StudyIncentiveConfigUpsert,
  PanelIncentiveDistribution,
  PanelIncentiveDistributionInsert,
  PanelIncentiveDistributionUpdate,
  PanelIncentiveDistributionWithDetails,
  IncentiveStatus,
  Currency,
  PanelIncentiveFilters,
  PaginationParams,
} from '../../lib/supabase/panel-types'
import type { PaginatedResult } from './participant-service'

export interface IncentiveStats {
  totalDistributions: number
  totalAmount: number
  pendingAmount: number
  sentAmount: number
  statusBreakdown: Record<IncentiveStatus, number>
  currencyBreakdown: Record<string, number>
}

export class PanelIncentiveService {
  constructor(private supabase: SupabaseClient) {}

  // ==========================================================================
  // STUDY INCENTIVE CONFIGS
  // ==========================================================================

  /**
   * Get incentive config for a study
   */
  async getConfig(studyId: string): Promise<StudyIncentiveConfig | null> {
    const { data, error } = await this.supabase
      .from('study_incentive_configs')
      .select('*')
      .eq('study_id', studyId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }

    return data
  }

  /**
   * Create or update incentive config for a study
   */
  async upsertConfig(
    userId: string,
    studyId: string,
    input: Partial<StudyIncentiveConfigUpsert>
  ): Promise<StudyIncentiveConfig> {
    // First, get existing config to merge with
    const existing = await this.getConfig(studyId)

    // Build the upsert payload - merge with existing or use defaults
    const upsertData = {
      study_id: studyId,
      user_id: userId,
      enabled: input.enabled !== undefined ? input.enabled : (existing?.enabled ?? false),
      amount: input.amount !== undefined ? input.amount : (existing?.amount ?? null),
      currency: input.currency ?? existing?.currency ?? 'USD',
      incentive_type: input.incentive_type ?? existing?.incentive_type ?? 'gift_card',
      description: input.description !== undefined ? input.description : (existing?.description ?? null),
      fulfillment_provider: input.fulfillment_provider ?? existing?.fulfillment_provider ?? null,
      fulfillment_config: input.fulfillment_config ?? existing?.fulfillment_config ?? {},
    }

    const { data, error } = await this.supabase
      .from('study_incentive_configs')
      .upsert(upsertData, { onConflict: 'study_id' })
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Delete incentive config for a study
   */
  async deleteConfig(studyId: string): Promise<void> {
    const { error } = await this.supabase
      .from('study_incentive_configs')
      .delete()
      .eq('study_id', studyId)

    if (error) throw error
  }

  /**
   * Get all study configs for an organization
   */
  async listConfigs(userId: string, organizationId: string): Promise<StudyIncentiveConfig[]> {
    // Join through studies to scope by organization
    const { data: studyIds, error: studyError } = await this.supabase
      .from('studies')
      .select('id')
      .eq('organization_id', organizationId)

    if (studyError) throw studyError
    if (!studyIds || studyIds.length === 0) return []

    const { data, error } = await this.supabase
      .from('study_incentive_configs')
      .select('*')
      .in('study_id', studyIds.map(s => s.id))
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  // ==========================================================================
  // INCENTIVE DISTRIBUTIONS
  // ==========================================================================

  /**
   * Get paginated list of distributions with filters, scoped to organization
   */
  async listDistributions(
    userId: string,
    organizationId: string,
    filters: PanelIncentiveFilters = {},
    pagination: PaginationParams = {}
  ): Promise<PaginatedResult<PanelIncentiveDistributionWithDetails>> {
    const { page = 1, limit = 50, sort_by = 'created_at', sort_order = 'desc' } = pagination

    let query = this.supabase
      .from('panel_incentive_distributions')
      .select(
        `
        *,
        panel_participants!inner (
          id,
          email,
          first_name,
          last_name
        ),
        studies!inner (
          id,
          title,
          organization_id
        )
      `,
        { count: 'exact' }
      )
      .eq('studies.organization_id', organizationId)

    // Apply filters
    if (filters.study_id) {
      query = query.eq('study_id', filters.study_id)
    }

    if (filters.status) {
      const statuses = Array.isArray(filters.status) ? filters.status : [filters.status]
      query = query.in('status', statuses)
    }

    if (filters.created_after) {
      query = query.gte('created_at', filters.created_after)
    }

    if (filters.created_before) {
      query = query.lte('created_at', filters.created_before)
    }

    // Pagination
    const offset = (page - 1) * limit
    query = query
      .order(sort_by, { ascending: sort_order === 'asc' })
      .range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) throw error

    const distributions = (data || []).map((d) => ({
      ...d,
      panel_participant: d.panel_participants as PanelIncentiveDistributionWithDetails['panel_participant'],
      study: { id: d.studies.id, title: d.studies.title },
    })) as unknown as PanelIncentiveDistributionWithDetails[]

    return {
      data: distributions,
      total: count || 0,
      page,
      limit,
      hasMore: offset + distributions.length < (count || 0),
    }
  }

  /**
   * Get distributions for a specific participant
   */
  async getForParticipant(panelParticipantId: string): Promise<PanelIncentiveDistribution[]> {
    const { data, error } = await this.supabase
      .from('panel_incentive_distributions')
      .select('*')
      .eq('panel_participant_id', panelParticipantId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  /**
   * Get distributions for a specific study
   */
  async getForStudy(studyId: string): Promise<PanelIncentiveDistributionWithDetails[]> {
    const { data, error } = await this.supabase
      .from('panel_incentive_distributions')
      .select(`
        *,
        panel_participants!inner (
          id,
          email,
          first_name,
          last_name
        )
      `)
      .eq('study_id', studyId)
      .order('created_at', { ascending: false })

    if (error) throw error

    return (data || []).map((d) => ({
      ...d,
      panel_participant: d.panel_participants as PanelIncentiveDistributionWithDetails['panel_participant'],
      study: null as any,
    })) as unknown as PanelIncentiveDistributionWithDetails[]
  }

  /**
   * Get a single distribution
   */
  async getDistribution(distributionId: string): Promise<PanelIncentiveDistribution | null> {
    const { data, error } = await this.supabase
      .from('panel_incentive_distributions')
      .select('*')
      .eq('id', distributionId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }

    return data
  }

  /**
   * Create a new distribution (promise incentive)
   */
  async createDistribution(
    input: PanelIncentiveDistributionInsert
  ): Promise<PanelIncentiveDistribution> {
    const { data, error } = await this.supabase
      .from('panel_incentive_distributions')
      .insert({
        panel_participant_id: input.panel_participant_id,
        study_id: input.study_id,
        participation_id: input.participation_id || null,
        amount: input.amount,
        currency: input.currency,
        status: input.status || 'promised',
        promised_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Update a distribution
   */
  async updateDistribution(
    distributionId: string,
    input: PanelIncentiveDistributionUpdate
  ): Promise<PanelIncentiveDistribution> {
    const updates: Record<string, unknown> = {}
    Object.entries(input).forEach(([key, value]) => {
      if (value !== undefined) {
        updates[key] = value
      }
    })

    // Auto-set timestamps based on status
    if (input.status === 'sent' && !input.sent_at) {
      updates.sent_at = new Date().toISOString()
    }
    if (input.status === 'redeemed' && !input.redeemed_at) {
      updates.redeemed_at = new Date().toISOString()
    }

    const { data, error } = await this.supabase
      .from('panel_incentive_distributions')
      .update(updates)
      .eq('id', distributionId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Mark distribution as sent
   */
  async markSent(
    distributionId: string,
    fulfillmentMethod?: string,
    fulfillmentReference?: string
  ): Promise<PanelIncentiveDistribution> {
    return this.updateDistribution(distributionId, {
      status: 'sent',
      fulfillment_method: fulfillmentMethod,
      fulfillment_reference: fulfillmentReference,
      sent_at: new Date().toISOString(),
    })
  }

  /**
   * Bulk mark distributions as sent
   */
  async bulkMarkSent(
    distributionIds: string[],
    fulfillmentMethod: string,
    fulfillmentReference?: string,
    notes?: string
  ): Promise<number> {
    const { data, error } = await this.supabase
      .from('panel_incentive_distributions')
      .update({
        status: 'sent',
        fulfillment_method: fulfillmentMethod,
        fulfillment_reference: fulfillmentReference || null,
        notes: notes || null,
        sent_at: new Date().toISOString(),
      })
      .in('id', distributionIds)
      .select()

    if (error) throw error
    return data?.length || 0
  }

  /**
   * Cancel a distribution
   */
  async cancelDistribution(distributionId: string, notes?: string): Promise<PanelIncentiveDistribution> {
    return this.updateDistribution(distributionId, {
      status: 'cancelled',
      notes,
    })
  }

  /**
   * Auto-create distribution when participant completes a study
   * Uses the study's incentive config
   */
  async autoCreateOnCompletion(
    panelParticipantId: string,
    studyId: string,
    participationId?: string
  ): Promise<PanelIncentiveDistribution | null> {
    // Get study incentive config
    const config = await this.getConfig(studyId)
    if (!config?.enabled || !config.amount) {
      return null
    }

    // Check for duplicate
    const { data: existing } = await this.supabase
      .from('panel_incentive_distributions')
      .select('id')
      .eq('panel_participant_id', panelParticipantId)
      .eq('study_id', studyId)
      .single()

    if (existing) {
      // Already has distribution for this study
      return null
    }

    // Create distribution
    return this.createDistribution({
      panel_participant_id: panelParticipantId,
      study_id: studyId,
      participation_id: participationId,
      amount: config.amount,
      currency: config.currency as Currency,
      status: 'promised',
    })
  }

  /**
   * Get incentive statistics for a study
   */
  async getStudyStats(studyId: string): Promise<IncentiveStats> {
    const { data, error } = await this.supabase
      .from('panel_incentive_distributions')
      .select('status, amount, currency')
      .eq('study_id', studyId)

    if (error) throw error

    const distributions = data || []

    const stats: IncentiveStats = {
      totalDistributions: distributions.length,
      totalAmount: 0,
      pendingAmount: 0,
      sentAmount: 0,
      statusBreakdown: {
        promised: 0,
        pending: 0,
        sent: 0,
        redeemed: 0,
        failed: 0,
        cancelled: 0,
      },
      currencyBreakdown: {},
    }

    for (const d of distributions) {
      stats.totalAmount += d.amount || 0
      stats.statusBreakdown[d.status as IncentiveStatus]++

      const currency = d.currency || 'USD'
      stats.currencyBreakdown[currency] = (stats.currencyBreakdown[currency] || 0) + d.amount

      if (['promised', 'pending'].includes(d.status)) {
        stats.pendingAmount += d.amount || 0
      } else if (['sent', 'redeemed'].includes(d.status)) {
        stats.sentAmount += d.amount || 0
      }
    }

    return stats
  }

  /**
   * Get overall incentive statistics scoped to organization
   */
  async getUserStats(userId: string, organizationId: string): Promise<IncentiveStats> {
    const { data, error } = await this.supabase
      .from('panel_incentive_distributions')
      .select(`
        status,
        amount,
        currency,
        studies!inner (organization_id)
      `)
      .eq('studies.organization_id', organizationId)

    if (error) throw error

    const distributions = data || []

    const stats: IncentiveStats = {
      totalDistributions: distributions.length,
      totalAmount: 0,
      pendingAmount: 0,
      sentAmount: 0,
      statusBreakdown: {
        promised: 0,
        pending: 0,
        sent: 0,
        redeemed: 0,
        failed: 0,
        cancelled: 0,
      },
      currencyBreakdown: {},
    }

    for (const d of distributions) {
      stats.totalAmount += d.amount || 0
      stats.statusBreakdown[d.status as IncentiveStatus]++

      const currency = d.currency || 'USD'
      stats.currencyBreakdown[currency] = (stats.currencyBreakdown[currency] || 0) + d.amount

      if (['promised', 'pending'].includes(d.status)) {
        stats.pendingAmount += d.amount || 0
      } else if (['sent', 'redeemed'].includes(d.status)) {
        stats.sentAmount += d.amount || 0
      }
    }

    return stats
  }
}

export function createPanelIncentiveService(supabase: SupabaseClient): PanelIncentiveService {
  return new PanelIncentiveService(supabase)
}
