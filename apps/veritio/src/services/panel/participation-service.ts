/**
 * Panel Participation Service
 *
 * Business logic for tracking panel participants' study participations.
 * Handles full funnel tracking: invited → started → completed.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  PanelStudyParticipation,
  PanelStudyParticipationInsert,
  PanelStudyParticipationUpdate,
  PanelStudyParticipationWithDetails,
  ParticipationStatus,
  ParticipationSource,
} from '../../lib/supabase/panel-types'

export interface ParticipationStats {
  invited: number
  started: number
  completed: number
  abandoned: number
  screened_out: number
  viewToStartRate: number
  startToCompleteRate: number
  averageCompletionTime: number | null
}

export class PanelParticipationService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Get all participations for a panel participant
   */
  async getForParticipant(
    panelParticipantId: string
  ): Promise<PanelStudyParticipationWithDetails[]> {
    const { data, error } = await this.supabase
      .from('panel_study_participations')
      .select(`
        *,
        studies!inner (
          id,
          title,
          study_type,
          status
        )
      `)
      .eq('panel_participant_id', panelParticipantId)
      .order('invited_at', { ascending: false })

    if (error) throw error

    return (data || []).map((d) => ({
      ...d,
      study: d.studies as PanelStudyParticipationWithDetails['study'],
      panel_participant: null as any, // Not included in this query
    })) as unknown as PanelStudyParticipationWithDetails[]
  }

  /**
   * Get all participations for a study
   */
  async getForStudy(studyId: string): Promise<PanelStudyParticipationWithDetails[]> {
    const { data, error } = await this.supabase
      .from('panel_study_participations')
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
      .order('invited_at', { ascending: false })

    if (error) throw error

    return (data || []).map((d) => ({
      ...d,
      panel_participant: d.panel_participants as PanelStudyParticipationWithDetails['panel_participant'],
      study: null as any, // Not included in this query
    })) as unknown as PanelStudyParticipationWithDetails[]
  }

  /**
   * Get a single participation
   */
  async get(participationId: string): Promise<PanelStudyParticipation | null> {
    const { data, error } = await this.supabase
      .from('panel_study_participations')
      .select('*')
      .eq('id', participationId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }

    return data
  }

  /**
   * Find the most recent participation by panel participant and study
   */
  async findByParticipantAndStudy(
    panelParticipantId: string,
    studyId: string
  ): Promise<PanelStudyParticipation | null> {
    const { data, error } = await this.supabase
      .from('panel_study_participations')
      .select('*')
      .eq('panel_participant_id', panelParticipantId)
      .eq('study_id', studyId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error

    return data
  }

  /**
   * Create a new participation (invite a participant to a study)
   */
  async create(input: PanelStudyParticipationInsert): Promise<PanelStudyParticipation> {
    const { data, error } = await this.supabase
      .from('panel_study_participations')
      .insert({
        panel_participant_id: input.panel_participant_id,
        study_id: input.study_id,
        status: input.status || 'invited',
        source: input.source || null,
        invited_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Update a participation
   */
  async update(
    participationId: string,
    input: PanelStudyParticipationUpdate
  ): Promise<PanelStudyParticipation> {
    const updates: Record<string, unknown> = {}
    Object.entries(input).forEach(([key, value]) => {
      if (value !== undefined) {
        updates[key] = value
      }
    })

    const { data, error } = await this.supabase
      .from('panel_study_participations')
      .update(updates)
      .eq('id', participationId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Mark participation as started
   */
  async markStarted(participationId: string): Promise<PanelStudyParticipation> {
    return this.update(participationId, {
      status: 'started',
      started_at: new Date().toISOString(),
    })
  }

  /**
   * Mark participation as completed
   */
  async markCompleted(
    participationId: string,
    participantResponseId?: string,
    completionTimeSeconds?: number
  ): Promise<PanelStudyParticipation> {
    return this.update(participationId, {
      status: 'completed',
      completed_at: new Date().toISOString(),
      participant_id: participantResponseId,
      completion_time_seconds: completionTimeSeconds,
    })
  }

  /**
   * Mark participation as abandoned
   */
  async markAbandoned(participationId: string): Promise<PanelStudyParticipation> {
    return this.update(participationId, {
      status: 'abandoned',
    })
  }

  /**
   * Mark participation as screened out
   */
  async markScreenedOut(participationId: string): Promise<PanelStudyParticipation> {
    return this.update(participationId, {
      status: 'screened_out',
    })
  }

  /**
   * Get or create participation (for when participant clicks link)
   */
  async getOrCreate(
    panelParticipantId: string,
    studyId: string,
    source?: ParticipationSource
  ): Promise<{ participation: PanelStudyParticipation; created: boolean }> {
    const existing = await this.findByParticipantAndStudy(panelParticipantId, studyId)
    if (existing) {
      return { participation: existing, created: false }
    }

    const participation = await this.create({
      panel_participant_id: panelParticipantId,
      study_id: studyId,
      source,
    })

    return { participation, created: true }
  }

  /**
   * Bulk invite participants to a study
   */
  async bulkInvite(
    panelParticipantIds: string[],
    studyId: string,
    source?: ParticipationSource
  ): Promise<{ created: number; skipped: number }> {
    // Get existing participations to avoid duplicates
    const { data: existing } = await this.supabase
      .from('panel_study_participations')
      .select('panel_participant_id')
      .eq('study_id', studyId)
      .in('panel_participant_id', panelParticipantIds)

    const existingIds = new Set(existing?.map((e) => e.panel_participant_id) || [])
    const toCreate = panelParticipantIds.filter((id) => !existingIds.has(id))

    if (toCreate.length === 0) {
      return { created: 0, skipped: panelParticipantIds.length }
    }

    const { data, error } = await this.supabase
      .from('panel_study_participations')
      .insert(
        toCreate.map((panel_participant_id) => ({
          panel_participant_id,
          study_id: studyId,
          status: 'invited' as ParticipationStatus,
          source: source || null,
          invited_at: new Date().toISOString(),
        }))
      )
      .select()

    if (error) throw error

    return {
      created: data?.length || 0,
      skipped: existingIds.size,
    }
  }

  /**
   * Get participation statistics for a study
   */
  async getStudyStats(studyId: string): Promise<ParticipationStats> {
    const { data, error } = await this.supabase
      .from('panel_study_participations')
      .select('status, completion_time_seconds')
      .eq('study_id', studyId)

    if (error) throw error

    const participations = data || []

    const counts = {
      invited: 0,
      started: 0,
      completed: 0,
      abandoned: 0,
      screened_out: 0,
    }

    let totalCompletionTime = 0
    let completionCount = 0

    for (const p of participations) {
      counts[p.status as keyof typeof counts]++
      if (p.status === 'completed' && p.completion_time_seconds) {
        totalCompletionTime += p.completion_time_seconds
        completionCount++
      }
    }

    const total = participations.length
    const startedAndCompleted = counts.started + counts.completed

    return {
      ...counts,
      viewToStartRate: total > 0 ? (startedAndCompleted / total) * 100 : 0,
      startToCompleteRate: startedAndCompleted > 0 ? (counts.completed / startedAndCompleted) * 100 : 0,
      averageCompletionTime: completionCount > 0 ? Math.round(totalCompletionTime / completionCount) : null,
    }
  }

  /**
   * Get participation statistics for a panel participant
   */
  async getParticipantStats(panelParticipantId: string): Promise<{
    totalStudies: number
    completed: number
    completionRate: number
    averageCompletionTime: number | null
  }> {
    const { data, error } = await this.supabase
      .from('panel_study_participations')
      .select('status, completion_time_seconds')
      .eq('panel_participant_id', panelParticipantId)

    if (error) throw error

    const participations = data || []
    const completed = participations.filter((p) => p.status === 'completed')

    let totalTime = 0
    let timeCount = 0
    for (const p of completed) {
      if (p.completion_time_seconds) {
        totalTime += p.completion_time_seconds
        timeCount++
      }
    }

    return {
      totalStudies: participations.length,
      completed: completed.length,
      completionRate: participations.length > 0 ? (completed.length / participations.length) * 100 : 0,
      averageCompletionTime: timeCount > 0 ? Math.round(totalTime / timeCount) : null,
    }
  }

  /**
   * Link an anonymous study participant to a panel participant
   * Called when we match by email after study completion
   */
  async linkToParticipantResponse(
    participationId: string,
    participantResponseId: string
  ): Promise<PanelStudyParticipation> {
    return this.update(participationId, {
      participant_id: participantResponseId,
    })
  }
}

export function createPanelParticipationService(supabase: SupabaseClient): PanelParticipationService {
  return new PanelParticipationService(supabase)
}
