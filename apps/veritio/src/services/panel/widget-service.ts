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
  // IP-based geolocation (auto-detected, non-blocking)
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

export class PanelWidgetService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Get widget config for a user + org
   */
  async getConfig(userId: string, organizationId: string): Promise<PanelWidgetConfig | null> {
    const { data, error } = await this.supabase
      .from('panel_widget_configs')
      .select('*')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }

    return data
  }

  /**
   * Get widget config by embed code ID (for public widget)
   */
  async getByEmbedCode(embedCodeId: string): Promise<PanelWidgetConfig | null> {
    const { data, error } = await this.supabase
      .from('panel_widget_configs')
      .select('*')
      .eq('embed_code_id', embedCodeId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }

    return data
  }

  /**
   * Create or update widget config
   */
  async upsertConfig(userId: string, organizationId: string, input: PanelWidgetConfigUpdate): Promise<PanelWidgetConfig> {
    // Get existing config to merge
    const existing = await this.getConfig(userId, organizationId)

    const defaultConfig: PanelWidgetConfigData = {
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

    // Merge configs
    const mergedConfig: PanelWidgetConfigData = {
      ...defaultConfig,
      ...(existing?.config || {}),
      ...(input.config || {}),
    }

    // Merge nested objects
    if (input.config?.captureSettings) {
      mergedConfig.captureSettings = {
        ...defaultConfig.captureSettings,
        ...(existing?.config as PanelWidgetConfigData)?.captureSettings,
        ...input.config.captureSettings,
      }
    }

    if (input.config?.frequencyCapping) {
      mergedConfig.frequencyCapping = {
        ...defaultConfig.frequencyCapping,
        ...(existing?.config as PanelWidgetConfigData)?.frequencyCapping,
        ...input.config.frequencyCapping,
      }
    }

    // Merge extended settings (targeting, scheduling, privacy, etc.)
    if (input.config?.targeting !== undefined) {
      mergedConfig.targeting = input.config.targeting
    } else if ((existing?.config as PanelWidgetConfigData)?.targeting) {
      mergedConfig.targeting = (existing?.config as PanelWidgetConfigData).targeting
    }

    if (input.config?.scheduling !== undefined) {
      mergedConfig.scheduling = input.config.scheduling
    } else if ((existing?.config as PanelWidgetConfigData)?.scheduling) {
      mergedConfig.scheduling = (existing?.config as PanelWidgetConfigData).scheduling
    }

    if (input.config?.privacy !== undefined) {
      mergedConfig.privacy = input.config.privacy
    } else if ((existing?.config as PanelWidgetConfigData)?.privacy) {
      mergedConfig.privacy = (existing?.config as PanelWidgetConfigData).privacy
    }

    if (input.config?.advancedTriggers !== undefined) {
      mergedConfig.advancedTriggers = input.config.advancedTriggers
    } else if ((existing?.config as PanelWidgetConfigData)?.advancedTriggers) {
      mergedConfig.advancedTriggers = (existing?.config as PanelWidgetConfigData).advancedTriggers
    }

    if (input.config?.placement !== undefined) {
      mergedConfig.placement = input.config.placement
    } else if ((existing?.config as PanelWidgetConfigData)?.placement) {
      mergedConfig.placement = (existing?.config as PanelWidgetConfigData).placement
    }

    if (input.config?.copyPersonalization !== undefined) {
      mergedConfig.copyPersonalization = input.config.copyPersonalization
    } else if ((existing?.config as PanelWidgetConfigData)?.copyPersonalization) {
      mergedConfig.copyPersonalization = (existing?.config as PanelWidgetConfigData).copyPersonalization
    }

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
    // If a study is selected, fetch its intercept settings and sync them
    if (studyId) {
      const studySettings = await this.getStudyInterceptSettings(studyId, userId)
      if (studySettings) {
        // Filter slideDirection to panel-compatible values ('left' | 'right')
        // Study settings may have 'top' | 'bottom' which aren't supported in panel
        const panelSlideDirection =
          studySettings.slideDirection === 'left' || studySettings.slideDirection === 'right'
            ? studySettings.slideDirection
            : 'right' // Default to 'right' if incompatible value

        // Merge study intercept settings into panel widget config
        return this.upsertConfig(userId, organizationId, {
          active_study_id: studyId,
          config: {
            // Core widget settings from study
            enabled: studySettings.enabled,
            position: studySettings.position,
            triggerType: studySettings.triggerType,
            triggerValue: studySettings.triggerValue,
            title: studySettings.title,
            description: studySettings.description,
            buttonText: studySettings.buttonText,
            // Visual settings
            widgetStyle: studySettings.widgetStyle,
            animation: studySettings.animation,
            bannerPosition: studySettings.bannerPosition,
            slideDirection: panelSlideDirection,
            badgePosition: studySettings.badgePosition,
          },
        })
      }
    }

    // If no study or study has no intercept settings, just update the active_study_id
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

    // Extract intercept settings from sharing_settings JSON
    const sharingSettings = data.sharing_settings as { intercept?: InterceptWidgetSettings } | null
    return sharingSettings?.intercept || null
  }

  /**
   * Get embed code HTML for a user's widget
   */
  async getEmbedCode(userId: string, organizationId: string, baseUrl: string): Promise<string> {
    let config = await this.getConfig(userId, organizationId)

    if (!config) {
      // Create default config
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
   * Get public widget configuration (for widget loader)
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

    // Get active study title and share_code if set
    let activeStudyTitle: string | undefined
    let activeStudyShareCode: string | undefined
    if (widgetConfig.active_study_id) {
      const { data: study } = await this.supabase
        .from('studies')
        .select('title, share_code')
        .eq('id', widgetConfig.active_study_id)
        .single()

      activeStudyTitle = study?.title
      activeStudyShareCode = study?.share_code
    }

    // Get user's branding preferences
    const { data: userPrefs } = await this.supabase
      .from('user_preferences')
      .select('default_theme_mode, default_primary_color, default_radius_option')
      .eq('user_id', widgetConfig.user_id)
      .single()

    return {
      config,
      activeStudyId: widgetConfig.active_study_id,
      activeStudyShareCode,
      activeStudyTitle,
      branding: {
        themeMode: (userPrefs?.default_theme_mode as 'light' | 'dark' | 'system') || 'light',
        primaryColor: userPrefs?.default_primary_color || '#7c3aed',
        radiusOption: (userPrefs?.default_radius_option as 'none' | 'small' | 'default' | 'large') || 'default',
      },
    }
  }

  /**
   * Process widget capture (when user submits email)
   * This creates/updates the panel participant and optionally creates a participation
   */
  async processCapture(
    userId: string,
    organizationId: string,
    payload: WidgetCapturePayload
  ): Promise<WidgetCaptureResult> {
    // First, find or create the participant
    const { data: existingParticipant } = await this.supabase
      .from('panel_participants')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('email', payload.email.toLowerCase())
      .single()

    let participantId: string
    let isNewParticipant = false

    if (existingParticipant) {
      participantId = existingParticipant.id

      // Update last active, demographics, and browser data
      const { data: current } = await this.supabase
        .from('panel_participants')
        .select('demographics, source_details')
        .eq('id', participantId)
        .single()

      const updates: Record<string, unknown> = {
        last_active_at: new Date().toISOString(),
      }

      if (payload.firstName) updates.first_name = payload.firstName
      if (payload.lastName) updates.last_name = payload.lastName
      if (payload.demographics) {
        // Merge demographics
        updates.demographics = {
          ...(current?.demographics || {}),
          ...payload.demographics,
        }
      }

      // Update source_details with latest browser data
      if (payload.browserData || payload.pageUrl || payload.referrer) {
        const existingSourceDetails = (current?.source_details as Record<string, unknown>) || {}
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
      // Create new participant with auto-detected browser data
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
            // Auto-detected browser data (no user input required)
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

      // Assign default widget tag
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
    // Find the Widget system tag
    const { data: widgetTag } = await this.supabase
      .from('panel_tags')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('name', 'Widget')
      .eq('is_system', true)
      .single()

    if (!widgetTag) return

    // Assign tag
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

  /**
   * Track widget impression
   */
  async trackImpression(_embedCodeId: string): Promise<void> {
    // This could be implemented with a separate analytics table
    // For now, we'll just log it
    // In production, you'd want to store this in an analytics table
  }

  /**
   * Track widget click
   */
  async trackClick(_embedCodeId: string): Promise<void> {
    // Same as above - would be stored in analytics table
  }
}

export function createPanelWidgetService(supabase: SupabaseClient): PanelWidgetService {
  return new PanelWidgetService(supabase)
}
