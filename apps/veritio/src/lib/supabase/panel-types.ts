/**
 * Panel Feature Type Definitions
 *
 * TypeScript types for the Panel participant CRM system.
 * These types correspond to the panel_* tables in the database.
 */

import { z } from 'zod'
import type { DemographicFieldType, DemographicProfileSettings } from './study-flow-types'

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

export const PARTICIPANT_STATUS = ['active', 'inactive', 'blacklisted'] as const
export type ParticipantStatus = (typeof PARTICIPANT_STATUS)[number]

export const PARTICIPANT_SOURCE = ['widget', 'import', 'manual', 'link', 'email', 'study'] as const
export type ParticipantSource = (typeof PARTICIPANT_SOURCE)[number]

export const TAG_ASSIGNMENT_SOURCE = ['widget', 'import', 'manual', 'link', 'auto', 'study'] as const
export type TagAssignmentSource = (typeof TAG_ASSIGNMENT_SOURCE)[number]

export const PARTICIPATION_STATUS = ['invited', 'started', 'completed', 'abandoned', 'screened_out'] as const
export type ParticipationStatus = (typeof PARTICIPATION_STATUS)[number]

export const PARTICIPATION_SOURCE = ['widget', 'link', 'email', 'direct'] as const
export type ParticipationSource = (typeof PARTICIPATION_SOURCE)[number]

export const INCENTIVE_TYPE = ['gift_card', 'cash', 'credit', 'donation', 'other'] as const
export type IncentiveType = (typeof INCENTIVE_TYPE)[number]

export const INCENTIVE_STATUS = ['promised', 'pending', 'sent', 'redeemed', 'failed', 'cancelled'] as const
export type IncentiveStatus = (typeof INCENTIVE_STATUS)[number]

// ISO 4217 currency codes (common ones)
export const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'CNY', 'INR', 'BRL'] as const
export type Currency = (typeof CURRENCIES)[number]

// ============================================================================
// DEMOGRAPHICS
// ============================================================================

export interface Demographics {
  country?: string
  age_range?: string // '18-24', '25-34', '35-44', '45-54', '55-64', '65+'
  gender?: string // 'male', 'female', 'non_binary', 'prefer_not_to_say', 'other'
  industry?: string
  job_role?: string
  company_size?: string // '1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'
  language?: string // ISO 639-1 code
}

export const demographicsSchema = z.object({
  country: z.string().optional(),
  age_range: z.string().optional(),
  gender: z.string().optional(),
  industry: z.string().optional(),
  job_role: z.string().optional(),
  company_size: z.string().optional(),
  language: z.string().optional(),
})

// ============================================================================
// PANEL PARTICIPANTS
// ============================================================================

export interface PanelParticipant {
  id: string
  user_id: string
  email: string
  first_name: string | null
  last_name: string | null
  status: ParticipantStatus
  source: ParticipantSource
  source_details: Record<string, unknown>
  demographics: Demographics
  custom_attributes: Record<string, unknown>
  consent_given_at: string | null
  consent_version: string | null
  last_contacted_at: string | null
  created_at: string
  updated_at: string
  last_active_at: string | null
}

export interface PanelParticipantInsert {
  user_id?: string // Will be set by service from auth
  email: string
  first_name?: string | null
  last_name?: string | null
  status?: ParticipantStatus
  source?: ParticipantSource
  source_details?: Record<string, unknown>
  demographics?: Demographics
  custom_attributes?: Record<string, unknown>
  consent_given_at?: string | null
  consent_version?: string | null
  last_contacted_at?: string | null
}

export interface PanelParticipantUpdate {
  email?: string
  first_name?: string | null
  last_name?: string | null
  status?: ParticipantStatus
  source?: ParticipantSource
  source_details?: Record<string, unknown>
  demographics?: Demographics
  custom_attributes?: Record<string, unknown>
  consent_given_at?: string | null
  consent_version?: string | null
  last_contacted_at?: string | null
  last_active_at?: string | null
}

// Zod schemas for validation
export const createPanelParticipantSchema = z.object({
  email: z.string().email('Invalid email address'),
  first_name: z.string().max(100).nullable().optional(),
  last_name: z.string().max(100).nullable().optional(),
  status: z.enum(PARTICIPANT_STATUS).optional().default('active'),
  source: z.enum(PARTICIPANT_SOURCE).optional().default('manual'),
  source_details: z.record(z.unknown()).optional(),
  demographics: demographicsSchema.optional(),
  custom_attributes: z.record(z.unknown()).optional(),
})

export const updatePanelParticipantSchema = z.object({
  email: z.string().email().optional(),
  first_name: z.string().max(100).nullable().optional(),
  last_name: z.string().max(100).nullable().optional(),
  status: z.enum(PARTICIPANT_STATUS).optional(),
  demographics: demographicsSchema.optional(),
  custom_attributes: z.record(z.unknown()).optional(),
  last_contacted_at: z.string().datetime().nullable().optional(),
})

// ============================================================================
// PANEL TAGS
// ============================================================================

export interface PanelTag {
  id: string
  user_id: string
  name: string
  color: string
  description: string | null
  is_system: boolean
  created_at: string
}

export interface PanelTagInsert {
  user_id?: string
  name: string
  color?: string
  description?: string | null
  is_system?: boolean
}

export interface PanelTagUpdate {
  name?: string
  color?: string
  description?: string | null
}

export const createPanelTagSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().default('#6b7280'),
  description: z.string().max(200).nullable().optional(),
})

export const updatePanelTagSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  description: z.string().max(200).nullable().optional(),
})

// ============================================================================
// PANEL PARTICIPANT TAGS (Junction)
// ============================================================================

export interface PanelParticipantTag {
  panel_participant_id: string
  panel_tag_id: string
  source: TagAssignmentSource
  assigned_at: string
}

export interface PanelParticipantTagInsert {
  panel_participant_id: string
  panel_tag_id: string
  source?: TagAssignmentSource
}

export const assignTagSchema = z.object({
  panel_tag_id: z.string().uuid(),
  source: z.enum(TAG_ASSIGNMENT_SOURCE).optional().default('manual'),
})

export const bulkAssignTagsSchema = z.object({
  panel_participant_ids: z.array(z.string().uuid()).min(1).max(1000),
  panel_tag_id: z.string().uuid(),
  source: z.enum(TAG_ASSIGNMENT_SOURCE).optional().default('manual'),
})

// ============================================================================
// PANEL STUDY PARTICIPATIONS
// ============================================================================

export interface PanelStudyParticipation {
  id: string
  panel_participant_id: string
  study_id: string
  participant_id: string | null
  status: ParticipationStatus
  source: ParticipationSource | null
  invited_at: string
  started_at: string | null
  completed_at: string | null
  completion_time_seconds: number | null
  created_at: string
  updated_at: string
}

export interface PanelStudyParticipationInsert {
  panel_participant_id: string
  study_id: string
  participant_id?: string | null
  status?: ParticipationStatus
  source?: ParticipationSource | null
}

export interface PanelStudyParticipationUpdate {
  participant_id?: string | null
  status?: ParticipationStatus
  started_at?: string | null
  completed_at?: string | null
  completion_time_seconds?: number | null
}

export const createParticipationSchema = z.object({
  panel_participant_id: z.string().uuid(),
  study_id: z.string().uuid(),
  source: z.enum(PARTICIPATION_SOURCE).optional(),
})

export const updateParticipationSchema = z.object({
  status: z.enum(PARTICIPATION_STATUS).optional(),
  participant_id: z.string().uuid().nullable().optional(),
  started_at: z.string().datetime().nullable().optional(),
  completed_at: z.string().datetime().nullable().optional(),
  completion_time_seconds: z.number().int().positive().nullable().optional(),
})

// ============================================================================
// STUDY INCENTIVE CONFIGS
// ============================================================================

export interface StudyIncentiveConfig {
  study_id: string
  user_id: string
  enabled: boolean
  amount: number | null
  currency: Currency
  incentive_type: IncentiveType
  description: string | null
  fulfillment_provider: string | null
  fulfillment_config: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface StudyIncentiveConfigUpsert {
  study_id: string
  user_id?: string
  enabled?: boolean
  amount?: number | null
  currency?: Currency
  incentive_type?: IncentiveType
  description?: string | null
  fulfillment_provider?: string | null
  fulfillment_config?: Record<string, unknown>
}

export const upsertIncentiveConfigSchema = z.object({
  enabled: z.boolean().optional().default(false),
  amount: z.number().positive().nullable().optional(),
  currency: z.enum(CURRENCIES).optional().default('USD'),
  incentive_type: z.enum(INCENTIVE_TYPE).optional().default('gift_card'),
  description: z.string().max(255).nullable().optional(),
})

// ============================================================================
// PANEL INCENTIVE DISTRIBUTIONS
// ============================================================================

export interface PanelIncentiveDistribution {
  id: string
  panel_participant_id: string
  study_id: string
  participation_id: string | null
  amount: number
  currency: Currency
  status: IncentiveStatus
  fulfillment_method: string | null
  fulfillment_reference: string | null
  notes: string | null
  promised_at: string | null
  sent_at: string | null
  redeemed_at: string | null
  created_at: string
  updated_at: string
}

export interface PanelIncentiveDistributionInsert {
  panel_participant_id: string
  study_id: string
  participation_id?: string | null
  amount: number
  currency: Currency
  status?: IncentiveStatus
}

export interface PanelIncentiveDistributionUpdate {
  status?: IncentiveStatus
  fulfillment_method?: string | null
  fulfillment_reference?: string | null
  notes?: string | null
  sent_at?: string | null
  redeemed_at?: string | null
}

export const updateDistributionStatusSchema = z.object({
  status: z.enum(INCENTIVE_STATUS),
  fulfillment_method: z.string().max(100).nullable().optional(),
  fulfillment_reference: z.string().max(255).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
})

export const bulkMarkSentSchema = z.object({
  distribution_ids: z.array(z.string().uuid()).min(1).max(100),
  fulfillment_method: z.string().max(100),
  fulfillment_reference: z.string().max(255).optional(),
  notes: z.string().max(1000).optional(),
})

// ============================================================================
// PANEL WIDGET CONFIGS
// ============================================================================

/**
 * A single demographic field for widget collection (flat structure, no sections)
 * Simplified version of study-flow's DemographicField for performance
 */
export interface WidgetDemographicField {
  id: string
  fieldType: DemographicFieldType
  position: number
  enabled: boolean
  required: boolean
  width: 'full' | 'half'
  label?: string // Optional custom label override
}

/**
 * Widget capture settings - supports both legacy string[] and new WidgetDemographicField[]
 * The upgrade is backward compatible - old configs with string[] still work
 */
export interface WidgetCaptureSettings {
  collectEmail: boolean
  collectDemographics: boolean
  // Legacy: simple array of field keys (backward compatible)
  // New: array of WidgetDemographicField objects with full configuration
  demographicFields: (keyof Demographics)[] | WidgetDemographicField[]
  // Field options (dropdown values, etc.) - only needed when demographicFields is WidgetDemographicField[]
  fieldOptions?: Partial<DemographicProfileSettings>
  // Customizable text for the form submit button (shown after data collection)
  // Default: "Let's Go" - distinct from the initial CTA button
  submitButtonText?: string
}

/**
 * Type guard to check if demographicFields uses the new format
 */
export function isWidgetDemographicFieldArray(
  fields: WidgetCaptureSettings['demographicFields']
): fields is WidgetDemographicField[] {
  return Array.isArray(fields) && fields.length > 0 && typeof fields[0] === 'object'
}

export interface WidgetFrequencyCapping {
  enabled: boolean
  maxImpressions: number
  timeWindow: 'day' | 'week' | 'month' | 'forever'
}

export type WidgetStyle = 'popup' | 'banner' | 'modal' | 'drawer' | 'badge'
export type WidgetAnimation = 'fade' | 'slide' | 'zoom' | 'bounce'
export type BannerPosition = 'top' | 'bottom'
export type SlideDirection = 'left' | 'right'
export type BadgePosition = 'left' | 'right'

// ============================================================================
// WIDGET EXTENDED SETTINGS (Targeting, Scheduling, Privacy, etc.)
// ============================================================================

/**
 * Visitor targeting settings - control who sees the widget
 */
export interface WidgetTargetingSettings {
  newVisitors: boolean // Show only to first-time visitors
  returningVisitors: boolean // Show only to returning visitors
  excludeParticipants: boolean // Don't show to those who already participated
}

/**
 * Business hours configuration
 */
export interface WidgetBusinessHours {
  start: string // HH:MM 24h format (e.g., "09:00")
  end: string // HH:MM 24h format (e.g., "17:00")
}

/**
 * Date range for campaign scheduling
 */
export interface WidgetDateRange {
  start?: string // ISO date string (YYYY-MM-DD)
  end?: string // ISO date string (YYYY-MM-DD)
}

/**
 * Smart scheduling settings - control when widget appears
 */
export interface WidgetSchedulingSettings {
  enabled: boolean
  businessHoursOnly: boolean
  businessHours: WidgetBusinessHours
  daysOfWeek: number[] // 0-6 (Sunday-Saturday), empty = all days
  dateRange: WidgetDateRange
  timezone: 'user' | 'fixed'
  fixedTimezone?: string // IANA timezone (e.g., "America/New_York")
}

/**
 * Cookie consent frameworks supported
 */
export type WidgetCookieConsentFramework = 'onetrust' | 'cookiebot' | 'custom'

/**
 * Cookie consent integration settings
 */
export interface WidgetCookieConsentSettings {
  enabled: boolean
  framework: WidgetCookieConsentFramework
  customCheckFunction?: string // JS expression (e.g., "window.cookieConsentGiven")
}

/**
 * Privacy and compliance settings
 */
export interface WidgetPrivacySettings {
  respectDoNotTrack: boolean
  showPrivacyLink: boolean
  privacyLinkUrl?: string
  privacyLinkText?: string
  cookieConsent: WidgetCookieConsentSettings
}

/**
 * Advanced trigger types
 */
export type WidgetAdvancedTriggerType =
  | 'time_delay'
  | 'scroll_percentage'
  | 'exit_intent'
  | 'page_visits'
  | 'time_on_page'
  | 'url_pattern'
  | 'element_visible'

/**
 * Individual trigger rule
 */
export interface WidgetTriggerRule {
  id: string
  type: WidgetAdvancedTriggerType
  value: number | string
  operator?: 'equals' | 'greater_than' | 'less_than' | 'contains' | 'matches'
}

/**
 * Advanced triggers with AND/OR logic
 */
export interface WidgetAdvancedTriggers {
  enabled: boolean
  rules: WidgetTriggerRule[]
  logic: 'AND' | 'OR'
}

/**
 * Copy personalization trigger types
 */
export type WidgetPersonalizationTrigger =
  | 'url_contains'
  | 'referrer_contains'
  | 'scroll_depth_gt'
  | 'time_on_site_gt'

/**
 * Copy personalization rule
 */
export interface WidgetPersonalizationRule {
  id: string
  trigger: WidgetPersonalizationTrigger
  value: string | number
  customTitle?: string
  customDescription?: string
  customButtonText?: string
}

/**
 * Copy personalization settings
 */
export interface WidgetCopyPersonalization {
  enabled: boolean
  rules: WidgetPersonalizationRule[]
  variables: {
    enabled: boolean
    customVariables?: Record<string, string>
  }
}

/**
 * Widget placement modes
 */
export type WidgetPlacementMode = 'fixed' | 'inline' | 'sticky' | 'after_element' | 'custom'

/**
 * Custom CSS positioning
 */
export interface WidgetCustomCSS {
  top?: string
  right?: string
  bottom?: string
  left?: string
  transform?: string
}

/**
 * Placement zone settings
 */
export interface WidgetPlacementSettings {
  mode: WidgetPlacementMode
  cssSelector?: string // For inline/after_element modes
  customCSS?: WidgetCustomCSS // For custom mode
}

export interface PanelWidgetConfigData {
  enabled: boolean
  position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
  triggerType: 'time_delay' | 'scroll_percentage' | 'exit_intent'
  triggerValue: number
  backgroundColor: string
  textColor: string
  buttonColor: string
  title: string
  description: string
  buttonText: string
  // Incentive display text (editable, uses {incentive} placeholder)
  incentiveText?: string
  captureSettings: WidgetCaptureSettings
  frequencyCapping: WidgetFrequencyCapping
  // Widget style settings
  widgetStyle?: WidgetStyle
  animation?: WidgetAnimation
  bannerPosition?: BannerPosition
  slideDirection?: SlideDirection
  badgePosition?: BadgePosition
  // Extended settings (targeting, scheduling, compliance, etc.)
  targeting?: WidgetTargetingSettings
  scheduling?: WidgetSchedulingSettings
  privacy?: WidgetPrivacySettings
  advancedTriggers?: WidgetAdvancedTriggers
  placement?: WidgetPlacementSettings
  copyPersonalization?: WidgetCopyPersonalization
}

export interface PanelWidgetConfig {
  user_id: string
  organization_id: string
  active_study_id: string | null
  config: PanelWidgetConfigData
  default_tag_ids: string[]
  embed_code_id: string | null
  created_at: string
  updated_at: string
}

export interface PanelWidgetConfigUpdate {
  active_study_id?: string | null
  config?: Partial<PanelWidgetConfigData>
  default_tag_ids?: string[]
}

export const updateWidgetConfigSchema = z.object({
  active_study_id: z.string().uuid().nullable().optional(),
  config: z.object({
    enabled: z.boolean().optional(),
    position: z.enum(['bottom-right', 'bottom-left', 'top-right', 'top-left']).optional(),
    triggerType: z.enum(['time_delay', 'scroll_percentage', 'exit_intent']).optional(),
    triggerValue: z.number().min(0).max(100).optional(),
    backgroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    textColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    buttonColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    title: z.string().max(100).optional(),
    description: z.string().max(200).optional(),
    buttonText: z.string().max(30).optional(),
    incentiveText: z.string().max(100).optional(),
    captureSettings: z.object({
      collectEmail: z.boolean(),
      collectDemographics: z.boolean(),
      // Support both legacy string[] and new WidgetDemographicField[] format
      demographicFields: z.union([
        z.array(z.string()), // Legacy format
        z.array(z.object({   // New format
          id: z.string(),
          fieldType: z.string(),
          position: z.number(),
          enabled: z.boolean(),
          required: z.boolean(),
          width: z.enum(['full', 'half']),
          label: z.string().optional(),
        })),
      ]),
      fieldOptions: z.record(z.unknown()).optional(),
      submitButtonText: z.string().max(30).optional(),
    }).optional(),
    frequencyCapping: z.object({
      enabled: z.boolean(),
      maxImpressions: z.number().min(1).max(100),
      timeWindow: z.enum(['day', 'week', 'month', 'forever']),
    }).optional(),
    // Widget style settings
    widgetStyle: z.enum(['popup', 'banner', 'modal', 'drawer', 'badge']).optional(),
    animation: z.enum(['fade', 'slide', 'zoom', 'bounce']).optional(),
    bannerPosition: z.enum(['top', 'bottom']).optional(),
    slideDirection: z.enum(['left', 'right']).optional(),
    badgePosition: z.enum(['left', 'right']).optional(),
    // Extended settings schemas
    targeting: z.object({
      newVisitors: z.boolean(),
      returningVisitors: z.boolean(),
      excludeParticipants: z.boolean(),
    }).optional(),
    scheduling: z.object({
      enabled: z.boolean(),
      businessHoursOnly: z.boolean(),
      businessHours: z.object({
        start: z.string(),
        end: z.string(),
      }),
      daysOfWeek: z.array(z.number().min(0).max(6)),
      dateRange: z.object({
        start: z.string().optional(),
        end: z.string().optional(),
      }),
      timezone: z.enum(['user', 'fixed']),
      fixedTimezone: z.string().optional(),
    }).optional(),
    privacy: z.object({
      respectDoNotTrack: z.boolean(),
      showPrivacyLink: z.boolean(),
      privacyLinkUrl: z.string().optional(),
      privacyLinkText: z.string().optional(),
      cookieConsent: z.object({
        enabled: z.boolean(),
        framework: z.enum(['onetrust', 'cookiebot', 'custom']),
        customCheckFunction: z.string().optional(),
      }),
    }).optional(),
    advancedTriggers: z.object({
      enabled: z.boolean(),
      rules: z.array(z.object({
        id: z.string(),
        type: z.enum(['time_delay', 'scroll_percentage', 'exit_intent', 'page_visits', 'time_on_page', 'url_pattern', 'element_visible']),
        value: z.union([z.number(), z.string()]),
        operator: z.enum(['equals', 'greater_than', 'less_than', 'contains', 'matches']).optional(),
      })),
      logic: z.enum(['AND', 'OR']),
    }).optional(),
    placement: z.object({
      mode: z.enum(['fixed', 'inline', 'sticky', 'after_element', 'custom']),
      cssSelector: z.string().optional(),
      customCSS: z.object({
        top: z.string().optional(),
        right: z.string().optional(),
        bottom: z.string().optional(),
        left: z.string().optional(),
        transform: z.string().optional(),
      }).optional(),
    }).optional(),
    copyPersonalization: z.object({
      enabled: z.boolean(),
      rules: z.array(z.object({
        id: z.string(),
        trigger: z.enum(['url_contains', 'referrer_contains', 'scroll_depth_gt', 'time_on_site_gt']),
        value: z.union([z.string(), z.number()]),
        customTitle: z.string().optional(),
        customDescription: z.string().optional(),
        customButtonText: z.string().optional(),
      })),
      variables: z.object({
        enabled: z.boolean(),
        customVariables: z.record(z.string()).optional(),
      }),
    }).optional(),
  }).optional(),
  default_tag_ids: z.array(z.string().uuid()).optional(),
})

// ============================================================================
// PANEL SEGMENTS
// ============================================================================

export type SegmentOperator = 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'in' | 'not_in' | 'is_empty' | 'is_not_empty'

export interface SegmentCondition {
  field: string // e.g., 'demographics.country', 'status', 'tags', 'custom_attributes.tier'
  operator: SegmentOperator
  value: unknown
}

export interface PanelSegment {
  id: string
  user_id: string
  name: string
  description: string | null
  conditions: SegmentCondition[]
  participant_count: number
  last_count_updated_at: string | null
  created_at: string
  updated_at: string
}

export interface PanelSegmentInsert {
  user_id?: string
  name: string
  description?: string | null
  conditions: SegmentCondition[]
}

export interface PanelSegmentUpdate {
  name?: string
  description?: string | null
  conditions?: SegmentCondition[]
  participant_count?: number
  last_count_updated_at?: string | null
}

export const segmentConditionSchema = z.object({
  field: z.string().min(1),
  operator: z.enum(['equals', 'not_equals', 'contains', 'not_contains', 'greater_than', 'less_than', 'in', 'not_in', 'is_empty', 'is_not_empty']),
  value: z.unknown(),
})

export const createSegmentSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).nullable().optional(),
  conditions: z.array(segmentConditionSchema).min(1).max(20),
})

export const updateSegmentSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  conditions: z.array(segmentConditionSchema).min(1).max(20).optional(),
})

// ============================================================================
// PANEL PARTICIPANT NOTES
// ============================================================================

export interface PanelParticipantNote {
  id: string
  panel_participant_id: string
  user_id: string
  content: string
  created_at: string
  updated_at: string
}

export interface PanelParticipantNoteInsert {
  panel_participant_id: string
  user_id?: string
  content: string
}

export interface PanelParticipantNoteUpdate {
  content: string
}

export const createNoteSchema = z.object({
  content: z.string().min(1).max(5000),
})

export const updateNoteSchema = z.object({
  content: z.string().min(1).max(5000),
})

// ============================================================================
// COMPOSITE TYPES (for API responses with joins)
// ============================================================================

export interface PanelParticipantWithTags extends PanelParticipant {
  tags: PanelTag[]
  study_count?: number // Optional - included in list view for performance
}

export interface PanelParticipantWithDetails extends PanelParticipantWithTags {
  study_count: number
  completion_rate: number
  total_incentives_earned: number
}

export interface PanelStudyParticipationWithDetails extends PanelStudyParticipation {
  panel_participant: Pick<PanelParticipant, 'id' | 'email' | 'first_name' | 'last_name'>
  study: {
    id: string
    title: string
    study_type: string
    status: string
    project_id: string
  }
}

export interface PanelIncentiveDistributionWithDetails extends PanelIncentiveDistribution {
  panel_participant: Pick<PanelParticipant, 'id' | 'email' | 'first_name' | 'last_name'>
  study: {
    id: string
    title: string
  }
}

// ============================================================================
// FILTER TYPES (for list operations)
// ============================================================================

export interface PanelParticipantFilters {
  status?: ParticipantStatus | ParticipantStatus[]
  source?: ParticipantSource | ParticipantSource[]
  tag_id?: string
  tag_ids?: string[]
  segment_id?: string
  search?: string // Search email, first_name, last_name
  has_completed_studies?: boolean
  last_active_after?: string
  last_active_before?: string
  created_after?: string
  created_before?: string
}

export interface PanelIncentiveFilters {
  study_id?: string
  status?: IncentiveStatus | IncentiveStatus[]
  created_after?: string
  created_before?: string
}

export interface PaginationParams {
  page?: number
  limit?: number
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

// ============================================================================
// BULK IMPORT TYPES
// ============================================================================

export interface ImportedParticipant {
  email: string
  first_name?: string
  last_name?: string
  demographics?: Demographics
  custom_attributes?: Record<string, unknown>
  tags?: string[] // Tag names to assign
}

export interface ImportResult {
  total: number
  created: number
  updated: number
  failed: number
  errors: Array<{
    row: number
    email?: string
    error: string
  }>
}

export const importParticipantsSchema = z.object({
  participants: z.array(z.object({
    email: z.string().email(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    demographics: demographicsSchema.optional(),
    custom_attributes: z.record(z.unknown()).optional(),
    tags: z.array(z.string()).optional(),
  })).min(1).max(10000),
  duplicate_handling: z.enum(['skip', 'update', 'merge']).default('skip'),
  auto_create_tags: z.boolean().default(true),
  auto_create_attributes: z.boolean().default(true),
  default_tag_id: z.string().uuid().optional(),
})

export type ImportDuplicateHandling = 'skip' | 'update' | 'merge'
