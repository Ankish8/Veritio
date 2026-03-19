/**
 * Panel Widget Service
 *
 * Business logic for managing widget configuration and capture.
 * Handles global widget settings and participant capture flow.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  PanelWidgetConfig,
  PanelWidgetConfigData,
  PanelWidgetConfigUpdate,
  Demographics,
  ParticipantSource,
} from '../../lib/supabase/panel-types'
import type { InterceptWidgetSettings } from '../../components/builders/shared/types'
import { nanoid } from 'nanoid'

// IP-based geolocation data
export interface GeoLocation {
  country?: string | null
  countryCode?: string | null
  region?: string | null
  city?: string | null
  postalCode?: string | null
  latitude?: number | null
  longitude?: number | null
  timezone?: string | null
  areaType?: string | null
}

// Auto-detected browser data (captured from visitor's browser)
export interface BrowserData {
  browser?: string
  operatingSystem?: string
  deviceType?: string
  language?: string
  timeZone?: string
  screenResolution?: string
  geoLocation?: GeoLocation
}

export interface WidgetCapturePayload {
  email: string
  firstName?: string
  lastName?: string
  demographics?: Demographics
  studyId?: string
  pageUrl?: string
  referrer?: string
  browserData?: BrowserData
}

export interface WidgetCaptureResult {
  participantId: string
  isNewParticipant: boolean
  participationCreated: boolean
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DEFAULT_CONFIG: PanelWidgetConfigData = {
  enabled: false,
  position: 'bottom-right',
  triggerType: 'time_delay',
  triggerValue: 5,
  backgroundColor: '#ffffff',
  textColor: '#1a1a1a',
  buttonColor: '#000000',
  title: 'Help us improve!',
  description: 'Share your feedback to help us improve.',
  buttonText: 'Get Started',
  captureSettings: {
    collectEmail: true,
    collectDemographics: true,
    demographicFields: ['country', 'age_range'],
  },
  frequencyCapping: {
    enabled: true,
    maxImpressions: 3,
    timeWindow: 'day',
  },
}

/** Fields that should be merged from existing -> input (preserving nested objects). */
const NESTED_MERGE_FIELDS = [
  'captureSettings',
  'frequencyCapping',
] as const

/** Fields that are copied as-is (no deep merge). */
const PASSTHROUGH_FIELDS = [
  'targeting',
  'scheduling',
  'privacy',
  'advancedTriggers',
  'placement',
  'copyPersonalization',
] as const

/**
 * Pure function: merge default, existing, and input configs into a final config.
 * Independently testable.
 */
export function mergeWidgetConfig(
  existing: PanelWidgetConfigData | null,
  input: Partial<PanelWidgetConfigData> | undefined
): PanelWidgetConfigData {
  const merged: PanelWidgetConfigData = {
    ...DEFAULT_CONFIG,
    ...(existing || {}),
    ...(input || {}),
  }

  // Deep-merge nested objects
  for (const field of NESTED_MERGE_FIELDS) {
    if (input?.[field]) {
      merged[field] = {
        ...DEFAULT_CONFIG[field],
        ...(existing?.[field] as Record<string, unknown> | undefined),
        ...input[field],
      } as any
    }
  }

  // For passthrough fields, prefer input, then existing
  for (const field of PASSTHROUGH_FIELDS) {
    if (input?.[field] !== undefined) {
      ;(merged as any)[field] = input[field]
    } else if (existing?.[field]) {
      ;(merged as any)[field] = existing[field]
    }
  }

  return merged
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class PanelWidgetService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Fetch a widget config by a single filter column.
   * Shared implementation for getConfig and getByEmbedCode.
   */
  private async fetchConfig(
    column: string,
    value: string,
    extraColumn?: string,
    extraValue?: string
  ): Promise<PanelWidgetConfig | null> {
    let query = this.supabase
      .from('panel_widget_configs')
      .select('*')
      .eq(column, value)

    if (extraColumn && extraValue) {
      query = query.eq(extraColumn, extraValue)
    }

    const { data, error } = await query.single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }

    return data
  }

  /**
   * Get widget config for a user + org
   */
  async getConfig(userId: string, organizationId: string): Promise<PanelWidgetConfig | null> {
    return this.fetchConfig('user_id', userId, 'organization_id', organizationId)
  }

  /**
   * Get widget config by embed code ID (for public widget)
   */
  async getByEmbedCode(embedCodeId: string): Promise<PanelWidgetConfig | null> {
    return this.fetchConfig('embed_code_id', embedCodeId)
  }

  /**
   * Create or update widget config
   */
  async upsertConfig(userId: string, organizationId: string, input: PanelWidgetConfigUpdate): Promise<PanelWidgetConfig> {
    const existing = await this.getConfig(userId, organizationId)

    const mergedConfig = mergeWidgetConfig(
      existing?.config as PanelWidgetConfigData | null,
      input.config
    )

    const { data, error } = await this.supabase
      .from('panel_widget_configs')
      .upsert(
        {
          user_id: userId,
          organization_id: organizationId,
          active_study_id: input.active_study_id !== undefined ? input.active_study_id : existing?.active_study_id,
          config: mergedConfig,
          default_tag_ids: input.default_tag_ids ?? existing?.default_tag_ids ?? [],
          embed_code_id: existing?.embed_code_id || this.generateEmbedCodeId(),
        },
        { onConflict: 'user_id,organization_id' }
      )
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Generate unique embed code ID
   */
  private generateEmbedCodeId(): string {
    return nanoid(12)
  }

  /**
   * Regenerate embed code ID
   */
  async regenerateEmbedCode(userId: string, organizationId: string): Promise<string> {
    const newId = this.generateEmbedCodeId()

    const { error } = await this.supabase
      .from('panel_widget_configs')
      .update({ embed_code_id: newId })
      .eq('user_id', userId)
      .eq('organization_id', organizationId)

    if (error) throw error
    return newId
  }

  /**
   * Enable/disable widget
   */
  async setEnabled(userId: string, organizationId: string, enabled: boolean): Promise<PanelWidgetConfig> {
    return this.upsertConfig(userId, organizationId, { config: { enabled } })
  }

  /**
   * Set active study for widget and sync its intercept settings
   */
  async setActiveStudy(userId: string, organizationId: string, studyId: string | null): Promise<PanelWidgetConfig> {
    if (studyId) {
      const studySettings = await this.getStudyInterceptSettings(studyId, userId)
      if (studySettings) {
        // Filter slideDirection to panel-compatible values ('left' | 'right')
        const panelSlideDirection =
          studySettings.slideDirection === 'left' || studySettings.slideDirection === 'right'
            ? studySettings.slideDirection
            : 'right'

        return this.upsertConfig(userId, organizationId, {
          active_study_id: studyId,
          config: {
            enabled: studySettings.enabled,
            position: studySettings.position,
            triggerType: studySettings.triggerType,
            triggerValue: studySettings.triggerValue,
            title: studySettings.title,
            description: studySettings.description,
            buttonText: studySettings.buttonText,
            widgetStyle: studySettings.widgetStyle,
            animation: studySettings.animation,
            bannerPosition: studySettings.bannerPosition,
            slideDirection: panelSlideDirection,
            badgePosition: studySettings.badgePosition,
          },
        })
      }
    }

    return this.upsertConfig(userId, organizationId, { active_study_id: studyId })
  }

  /**
   * Get a study's intercept widget settings from sharing_settings
   */
  async getStudyInterceptSettings(
    studyId: string,
    userId: string
  ): Promise<InterceptWidgetSettings | null> {
    const { data, error } = await this.supabase
      .from('studies')
      .select('sharing_settings')
      .eq('id', studyId)
      .eq('user_id', userId)
      .single()

    if (error || !data) return null

    const sharingSettings = data.sharing_settings as { intercept?: InterceptWidgetSettings } | null
    return sharingSettings?.intercept || null
  }

  /**
   * Get embed code HTML for a user's widget
   */
  async getEmbedCode(userId: string, organizationId: string, baseUrl: string): Promise<string> {
    let config = await this.getConfig(userId, organizationId)

    if (!config) {
      config = await this.upsertConfig(userId, organizationId, {})
    }

    const embedCodeId = config.embed_code_id

    return `<!-- Veritio Panel Widget -->
<script>
  (function(w,d,s,o,f,js,fjs){
    w['VeritioWidget']=o;w[o]=w[o]||function(){(w[o].q=w[o].q||[]).push(arguments)};
    js=d.createElement(s),fjs=d.getElementsByTagName(s)[0];
    js.id=o;js.src=f;js.async=1;fjs.parentNode.insertBefore(js,fjs);
  }(window,document,'script','veritio','${baseUrl}/widget/${embedCodeId}/loader.js'));
  veritio('init');
</script>
<!-- End Veritio Panel Widget -->`
  }

  /**
   * Get public widget configuration (for widget loader).
   *
   * Parallelises the study and user-preferences lookups.
   */
  async getPublicConfig(embedCodeId: string): Promise<{
    config: PanelWidgetConfigData
    activeStudyId: string | null
    activeStudyShareCode?: string
    activeStudyTitle?: string
    branding: {
      themeMode: 'light' | 'dark' | 'system'
      primaryColor: string
      radiusOption: 'none' | 'small' | 'default' | 'large'
    }
  } | null> {
    const widgetConfig = await this.getByEmbedCode(embedCodeId)
    if (!widgetConfig) return null

    const config = widgetConfig.config as PanelWidgetConfigData
    if (!config.enabled) return null

    // Parallelise study and branding lookups
    const [studyResult, prefsResult] = await Promise.all([
      widgetConfig.active_study_id
        ? this.supabase
            .from('studies')
            .select('title, share_code')
            .eq('id', widgetConfig.active_study_id)
            .single()
        : Promise.resolve({ data: null }),
      this.supabase
        .from('user_preferences')
        .select('default_theme_mode, default_primary_color, default_radius_option')
        .eq('user_id', widgetConfig.user_id)
        .single(),
    ])

    const study = studyResult.data as { title?: string; share_code?: string } | null
    const userPrefs = prefsResult.data as {
      default_theme_mode?: string
      default_primary_color?: string
      default_radius_option?: string
    } | null

    return {
      config,
      activeStudyId: widgetConfig.active_study_id,
      activeStudyShareCode: study?.share_code,
      activeStudyTitle: study?.title,
      branding: {
        themeMode: (userPrefs?.default_theme_mode as 'light' | 'dark' | 'system') || 'light',
        primaryColor: userPrefs?.default_primary_color || '#7c3aed',
        radiusOption: (userPrefs?.default_radius_option as 'none' | 'small' | 'default' | 'large') || 'default',
      },
    }
  }

  /**
   * Process widget capture (when user submits email).
   * Creates/updates the panel participant and optionally creates a participation.
   *
   * For existing participants, fetches demographics and source_details in the
   * initial query to avoid a second round-trip.
   */
  async processCapture(
    userId: string,
    organizationId: string,
    payload: WidgetCapturePayload
  ): Promise<WidgetCaptureResult> {
    // FIX: Fetch id + demographics + source_details in a single query
    // instead of fetching id first and then the rest separately.
    const { data: existingParticipant } = await this.supabase
      .from('panel_participants')
      .select('id, demographics, source_details')
      .eq('organization_id', organizationId)
      .eq('email', payload.email.toLowerCase())
      .single()

    let participantId: string
    let isNewParticipant = false

    if (existingParticipant) {
      participantId = existingParticipant.id

      const updates: Record<string, unknown> = {
        last_active_at: new Date().toISOString(),
      }

      if (payload.firstName) updates.first_name = payload.firstName
      if (payload.lastName) updates.last_name = payload.lastName
      if (payload.demographics) {
        updates.demographics = {
          ...(existingParticipant.demographics || {}),
          ...payload.demographics,
        }
      }

      if (payload.browserData || payload.pageUrl || payload.referrer) {
        const existingSourceDetails = (existingParticipant.source_details as Record<string, unknown>) || {}
        updates.source_details = {
          ...existingSourceDetails,
          page_url: payload.pageUrl || existingSourceDetails.page_url,
          referrer: payload.referrer || existingSourceDetails.referrer,
          browser_data: payload.browserData || existingSourceDetails.browser_data || {},
          last_visit_at: new Date().toISOString(),
        }
      }

      await this.supabase.from('panel_participants').update(updates).eq('id', participantId)
    } else {
      const { data: newParticipant, error } = await this.supabase
        .from('panel_participants')
        .insert({
          user_id: userId,
          organization_id: organizationId,
          email: payload.email.toLowerCase(),
          first_name: payload.firstName || null,
          last_name: payload.lastName || null,
          status: 'active',
          source: 'widget' as ParticipantSource,
          source_details: {
            page_url: payload.pageUrl,
            referrer: payload.referrer,
            browser_data: payload.browserData || {},
          },
          demographics: payload.demographics || {},
          consent_given_at: new Date().toISOString(),
        })
        .select('id')
        .single()

      if (error) throw error
      participantId = newParticipant.id
      isNewParticipant = true

      await this.assignWidgetTag(organizationId, participantId)
    }

    // Create participation if study is specified
    let participationCreated = false
    if (payload.studyId) {
      const { data: existingParticipation } = await this.supabase
        .from('panel_study_participations')
        .select('id')
        .eq('panel_participant_id', participantId)
        .eq('study_id', payload.studyId)
        .single()

      if (!existingParticipation) {
        await this.supabase.from('panel_study_participations').insert({
          panel_participant_id: participantId,
          study_id: payload.studyId,
          status: 'invited',
          source: 'widget',
          invited_at: new Date().toISOString(),
        })
        participationCreated = true
      }
    }

    return {
      participantId,
      isNewParticipant,
      participationCreated,
    }
  }

  /**
   * Assign the system "Widget" tag to a participant
   */
  private async assignWidgetTag(organizationId: string, participantId: string): Promise<void> {
    const { data: widgetTag } = await this.supabase
      .from('panel_tags')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('name', 'Widget')
      .eq('is_system', true)
      .single()

    if (!widgetTag) return

    await this.supabase.from('panel_participant_tags').insert({
      panel_participant_id: participantId,
      panel_tag_id: widgetTag.id,
      source: 'widget',
    })
  }

  /**
   * Get available studies for widget (active, not completed)
   */
  async getAvailableStudies(userId: string): Promise<
    Array<{
      id: string
      title: string
      study_type: string
    }>
  > {
    const { data, error } = await this.supabase
      .from('studies')
      .select('id, title, study_type')
      .eq('user_id', userId)
      .in('status', ['active', 'paused'])
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  // TODO: Implement widget impression tracking with a dedicated analytics table.
  async trackImpression(_embedCodeId: string): Promise<void> {}

  // TODO: Implement widget click tracking with a dedicated analytics table.
  async trackClick(_embedCodeId: string): Promise<void> {}
}

export function createPanelWidgetService(supabase: SupabaseClient): PanelWidgetService {
  return new PanelWidgetService(supabase)
}
