/**
 * Study Completion Sync Service
 *
 * Syncs demographics collected during study completion back to the panel CRM.
 * When a study participant completes a study with demographic data, this service:
 * 1. Finds or creates a panel_participant by email
 * 2. Merges study demographics into the panel participant's demographics
 * 3. Updates panel_study_participations status to 'completed'
 * 4. Links the study response to the participation record
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { ParticipantDemographicData } from '../../lib/supabase/study-flow-types'
import type {
  Demographics,
  PanelParticipant,
  PanelStudyParticipation,
} from '../../lib/supabase/panel-types'

// ============================================================================
// TYPES
// ============================================================================

export interface StudyCompletionSyncInput {
  /** Study that was completed */
  studyId: string
  /** Owner of the study (for panel lookup) */
  studyOwnerId: string
  /** Email of the participant who completed */
  participantEmail: string
  /** ID of the participant response record (participants table) */
  participantResponseId: string
  /** Demographic data collected during study */
  demographicData?: ParticipantDemographicData | null
  /** Time taken to complete in seconds */
  completionTimeSeconds?: number
}

export interface StudyCompletionSyncResult {
  /** Whether sync was successful */
  success: boolean
  /** Panel participant (found or created) */
  panelParticipant: PanelParticipant | null
  /** Whether panel participant was newly created */
  participantCreated: boolean
  /** Panel participation record (found or created) */
  participation: PanelStudyParticipation | null
  /** Whether participation was newly created */
  participationCreated: boolean
  /** Number of demographic fields merged */
  demographicsUpdated: number
  /** Error message if sync failed */
  error?: string
}

// ============================================================================
// FIELD MAPPING: Study Demographic Fields -> Panel Demographics
// ============================================================================

/**
 * Maps study demographic field names (camelCase) to panel demographic field names (snake_case)
 */
const STUDY_TO_PANEL_DEMOGRAPHICS: Record<string, keyof Demographics> = {
  // Location - from ParticipantDemographicData.location.country
  'location.country': 'country',
  // Simple mappings
  ageRange: 'age_range',
  gender: 'gender',
  industry: 'industry',
  jobTitle: 'job_role',
  companySize: 'company_size',
  language: 'language',
  preferredLanguage: 'language',
}

// ============================================================================
// SERVICE
// ============================================================================

export class StudyCompletionSyncService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Sync study completion to panel participant.
   *
   * This is the main entry point called after a study is completed.
   * It handles the full sync workflow:
   * 1. Find or create panel participant by email
   * 2. Merge demographics (study data supplements, doesn't overwrite panel data)
   * 3. Update participation record status
   */
  async syncStudyToPanel(input: StudyCompletionSyncInput): Promise<StudyCompletionSyncResult> {
    const {
      studyId,
      studyOwnerId,
      participantEmail,
      participantResponseId,
      demographicData,
      completionTimeSeconds,
    } = input

    try {
      // 1. Find or create panel participant
      const { participant, created: participantCreated } = await this.findOrCreatePanelParticipant(
        studyOwnerId,
        participantEmail,
        demographicData
      )

      // 2. Merge demographics if provided
      let demographicsUpdated = 0
      if (demographicData && participant) {
        demographicsUpdated = await this.mergeDemographics(
          participant.id,
          participant.demographics,
          demographicData
        )
      }

      // 3. Update last_active_at
      if (participant) {
        await this.supabase
          .from('panel_participants')
          .update({ last_active_at: new Date().toISOString() })
          .eq('id', participant.id)
      }

      // 4. Create participation record (always new row, supports retakes)
      const { participation, created: participationCreated } =
        await this.createCompletedParticipation(
          participant?.id || '',
          studyId,
          participantResponseId,
          completionTimeSeconds
        )

      return {
        success: true,
        panelParticipant: participant,
        participantCreated,
        participation,
        participationCreated,
        demographicsUpdated,
      }
    } catch (error) {
      return {
        success: false,
        panelParticipant: null,
        participantCreated: false,
        participation: null,
        participationCreated: false,
        demographicsUpdated: 0,
        error: error instanceof Error ? error.message : 'Unknown sync error',
      }
    }
  }

  /**
   * Find panel participant by email, or create a new one
   */
  private async findOrCreatePanelParticipant(
    userId: string,
    email: string,
    demographicData?: ParticipantDemographicData | null
  ): Promise<{ participant: PanelParticipant | null; created: boolean }> {
    // First, try to find existing
    const { data: existing } = await this.supabase
      .from('panel_participants')
      .select('*')
      .eq('user_id', userId)
      .eq('email', email.toLowerCase())
      .single()

    if (existing) {
      return { participant: existing as PanelParticipant, created: false }
    }

    // Create new panel participant
    const initialDemographics = this.extractDemographics(demographicData)

    const { data: created, error } = await this.supabase
      .from('panel_participants')
      .insert({
        user_id: userId,
        email: email.toLowerCase(),
        first_name: demographicData?.firstName || null,
        last_name: demographicData?.lastName || null,
        status: 'active',
        source: 'study', // New source type for study-originated participants
        source_details: { synced_from: 'study_completion' },
        demographics: initialDemographics,
        custom_attributes: {},
        consent_given_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create panel participant: ${error.message}`)
    }

    return { participant: created as PanelParticipant, created: true }
  }

  /**
   * Merge study demographics into panel participant's demographics.
   * Only fills in missing fields - never overwrites existing panel data.
   *
   * @returns Number of fields that were updated
   */
  private async mergeDemographics(
    participantId: string,
    existingDemographics: Demographics,
    studyData: ParticipantDemographicData
  ): Promise<number> {
    const updates: Partial<Demographics> = {}
    let updatedCount = 0

    // Map study fields to panel fields
    for (const [studyField, panelField] of Object.entries(STUDY_TO_PANEL_DEMOGRAPHICS)) {
      // Get value from study data (handle nested location.country)
      let value: string | undefined
      if (studyField === 'location.country') {
        value = studyData.location?.country
      } else {
        value = (studyData as Record<string, unknown>)[studyField] as string | undefined
      }

      // Only update if:
      // 1. Study has a value
      // 2. Panel doesn't already have a value for this field
      if (value && !existingDemographics[panelField]) {
        updates[panelField] = value
        updatedCount++
      }
    }

    // Also update first_name and last_name if missing (these are on the participant, not demographics)
    const nameUpdates: Record<string, string> = {}
    if (studyData.firstName) {
      const { data: current } = await this.supabase
        .from('panel_participants')
        .select('first_name')
        .eq('id', participantId)
        .single()
      if (current && !current.first_name) {
        nameUpdates.first_name = studyData.firstName
      }
    }
    if (studyData.lastName) {
      const { data: current } = await this.supabase
        .from('panel_participants')
        .select('last_name')
        .eq('id', participantId)
        .single()
      if (current && !current.last_name) {
        nameUpdates.last_name = studyData.lastName
      }
    }

    // Apply updates if any
    if (updatedCount > 0 || Object.keys(nameUpdates).length > 0) {
      const finalUpdates: Record<string, unknown> = { ...nameUpdates }
      if (updatedCount > 0) {
        finalUpdates.demographics = { ...existingDemographics, ...updates }
      }

      await this.supabase
        .from('panel_participants')
        .update(finalUpdates)
        .eq('id', participantId)
    }

    return updatedCount + Object.keys(nameUpdates).length
  }

  /**
   * Extract demographics from study data into panel format
   */
  private extractDemographics(data?: ParticipantDemographicData | null): Demographics {
    if (!data) return {}

    const demographics: Demographics = {}

    if (data.location?.country) demographics.country = data.location.country
    if (data.ageRange) demographics.age_range = data.ageRange
    if (data.gender) demographics.gender = data.gender
    if (data.industry) demographics.industry = data.industry
    if (data.jobTitle) demographics.job_role = data.jobTitle
    if (data.companySize) demographics.company_size = data.companySize
    if (data.language || data.preferredLanguage) {
      demographics.language = String(data.language || data.preferredLanguage)
    }

    return demographics
  }

  /**
   * Create a new participation record marked as completed.
   * Always creates a new row so retakes of the same study are tracked individually.
   */
  private async createCompletedParticipation(
    panelParticipantId: string,
    studyId: string,
    participantResponseId: string,
    completionTimeSeconds?: number
  ): Promise<{ participation: PanelStudyParticipation | null; created: boolean }> {
    if (!panelParticipantId) {
      return { participation: null, created: false }
    }

    const now = new Date().toISOString()
    const { data: created, error } = await this.supabase
      .from('panel_study_participations')
      .insert({
        panel_participant_id: panelParticipantId,
        study_id: studyId,
        status: 'completed',
        source: 'direct',
        invited_at: now,
        started_at: now,
        completed_at: now,
        participant_id: participantResponseId,
        completion_time_seconds: completionTimeSeconds,
      })
      .select()
      .single()

    if (error) throw error
    return { participation: created as PanelStudyParticipation, created: true }
  }
}

// ============================================================================
// FACTORY
// ============================================================================

export function createStudyCompletionSyncService(
  supabase: SupabaseClient
): StudyCompletionSyncService {
  return new StudyCompletionSyncService(supabase)
}
