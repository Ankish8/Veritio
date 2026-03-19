// ============================================================================
// User Preferences Types
// ============================================================================

// Enum-like types for strict typing
export type DisplayNamePreference = 'full_name' | 'first_name' | 'email'
export type DashboardTheme = 'light' | 'dark' | 'system'
export type TableDensity = 'compact' | 'default' | 'comfortable'
export type StylePreset = 'default' | 'vega' | 'nova' | 'maia' | 'lyra' | 'mira'
export type RadiusOption = 'none' | 'small' | 'default' | 'large'
export type ThemeMode = 'light' | 'dark' | 'system'
export type ClosingRuleType = 'none' | 'date' | 'participant_count' | 'both'
export type ResponsePreventionLevel = 'none' | 'relaxed' | 'moderate' | 'strict'

// ============================================================================
// Database Row Type (matches Supabase table structure)
// ============================================================================

export interface UserPreferencesRow {
  id: string
  user_id: string

  // Profile
  avatar_url: string | null
  display_name_preference: DisplayNamePreference | null

  // Study defaults - Branding
  default_primary_color: string | null
  default_background_color: string | null
  default_style_preset: StylePreset | null
  default_radius_option: RadiusOption | null
  default_theme_mode: ThemeMode | null
  default_logo_url: string | null
  default_logo_size: number | null

  // Study defaults - Settings
  default_language: string | null
  default_closing_rule_type: ClosingRuleType | null
  default_max_participants: number | null
  default_response_prevention_level: ResponsePreventionLevel | null

  // Study defaults - Notifications
  default_notifications_enabled: boolean | null
  default_notify_every_response: boolean | null
  default_notify_milestones: boolean | null
  default_milestone_values: number[] | null
  default_notify_daily_digest: boolean | null
  default_notify_on_close: boolean | null

  // Dashboard appearance
  dashboard_theme: DashboardTheme | null
  dashboard_table_density: TableDensity | null
  dashboard_show_archived: boolean | null

  // Account email notifications
  email_marketing: boolean | null
  email_product_updates: boolean | null
  email_security_alerts: boolean | null

  // Data & Privacy
  analytics_enabled: boolean | null

  // Workspace
  last_active_org_id: string | null

  // AI model configuration
  ai_openai_api_key: string | null
  ai_openai_base_url: string | null
  ai_openai_model: string | null
  ai_mercury_api_key: string | null
  ai_mercury_base_url: string | null
  ai_mercury_model: string | null
  ai_use_same_provider: boolean | null

  // Timestamps
  created_at: string | null
  updated_at: string | null
}

// ============================================================================
// Grouped Types for UI Consumption
// ============================================================================

/** Profile preferences */
export interface ProfilePreferences {
  avatarUrl: string | null
  displayNamePreference: DisplayNamePreference
}

/** Study default branding settings */
export interface StudyDefaultsBranding {
  primaryColor: string
  backgroundColor: string
  stylePreset: StylePreset
  radiusOption: RadiusOption
  themeMode: ThemeMode
  logoUrl: string | null
  logoSize: number
}

/** Study default settings */
export interface StudyDefaultsSettings {
  language: string
  closingRuleType: ClosingRuleType
  maxParticipants: number | null
  responsePreventionLevel: ResponsePreventionLevel
}

/** Study default notification settings */
export interface StudyDefaultsNotifications {
  enabled: boolean
  everyResponse: boolean
  milestones: boolean
  milestoneValues: number[]
  dailyDigest: boolean
  onClose: boolean
}

/** All study defaults grouped */
export interface StudyDefaults {
  branding: StudyDefaultsBranding
  settings: StudyDefaultsSettings
  notifications: StudyDefaultsNotifications
}

/** Dashboard appearance preferences */
export interface DashboardPreferences {
  theme: DashboardTheme
  tableDensity: TableDensity
  showArchived: boolean
}

/** Account email notification preferences */
export interface NotificationPreferences {
  marketing: boolean
  productUpdates: boolean
  securityAlerts: boolean
}

/** Privacy preferences */
export interface PrivacyPreferences {
  analyticsEnabled: boolean
}

/** Workspace preferences */
export interface WorkspacePreferences {
  lastActiveOrgId: string | null
}

/** AI provider configuration (read shape — keys are masked) */
export interface AiProviderConfig {
  apiKeyMasked: string | null
  hasApiKey: boolean
  baseUrl: string | null
  model: string | null
}

/** AI model configuration for UI consumption */
export interface UserAiConfig {
  openai: AiProviderConfig
  mercury: AiProviderConfig
  useSameProvider: boolean
}

/** AI provider configuration for updates (write shape — raw key) */
export interface AiProviderConfigUpdate {
  apiKey?: string | null
  baseUrl?: string | null
  model?: string | null
}

/** AI model configuration for updates */
export interface UserAiConfigUpdate {
  openai?: AiProviderConfigUpdate
  mercury?: AiProviderConfigUpdate
  useSameProvider?: boolean
}

/** Complete user preferences object for UI consumption */
export interface UserPreferences {
  profile: ProfilePreferences
  studyDefaults: StudyDefaults
  dashboard: DashboardPreferences
  notifications: NotificationPreferences
  privacy: PrivacyPreferences
  workspace: WorkspacePreferences
  ai: UserAiConfig
}

// ============================================================================
// Default Values
// ============================================================================

export const DEFAULT_PROFILE_PREFERENCES: ProfilePreferences = {
  avatarUrl: null,
  displayNamePreference: 'full_name',
}

export const DEFAULT_STUDY_DEFAULTS_BRANDING: StudyDefaultsBranding = {
  primaryColor: '#18181b',
  backgroundColor: '#ffffff',
  stylePreset: 'default',
  radiusOption: 'default',
  themeMode: 'light',
  logoUrl: null,
  logoSize: 48,
}

export const DEFAULT_STUDY_DEFAULTS_SETTINGS: StudyDefaultsSettings = {
  language: 'en-US',
  closingRuleType: 'none',
  maxParticipants: null,
  responsePreventionLevel: 'none',
}

export const DEFAULT_STUDY_DEFAULTS_NOTIFICATIONS: StudyDefaultsNotifications = {
  enabled: false,
  everyResponse: false,
  milestones: true,
  milestoneValues: [10, 50, 100, 500, 1000],
  dailyDigest: false,
  onClose: true,
}

export const DEFAULT_STUDY_DEFAULTS: StudyDefaults = {
  branding: DEFAULT_STUDY_DEFAULTS_BRANDING,
  settings: DEFAULT_STUDY_DEFAULTS_SETTINGS,
  notifications: DEFAULT_STUDY_DEFAULTS_NOTIFICATIONS,
}

export const DEFAULT_DASHBOARD_PREFERENCES: DashboardPreferences = {
  theme: 'system',
  tableDensity: 'default',
  showArchived: false,
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  marketing: true,
  productUpdates: true,
  securityAlerts: true,
}

export const DEFAULT_PRIVACY_PREFERENCES: PrivacyPreferences = {
  analyticsEnabled: true,
}

export const DEFAULT_WORKSPACE_PREFERENCES: WorkspacePreferences = {
  lastActiveOrgId: null,
}

export const DEFAULT_AI_PROVIDER_CONFIG: AiProviderConfig = {
  apiKeyMasked: null,
  hasApiKey: false,
  baseUrl: null,
  model: null,
}

export const DEFAULT_AI_CONFIG: UserAiConfig = {
  openai: { ...DEFAULT_AI_PROVIDER_CONFIG },
  mercury: { ...DEFAULT_AI_PROVIDER_CONFIG },
  useSameProvider: false,
}

/** Mask an API key for display — never expose full keys to the client */
export function maskApiKey(key: string | null): string | null {
  if (!key) return null
  if (key.length < 8) return '***'
  return `${key.slice(0, 3)}...${key.slice(-4)}`
}

/** Detect if a value looks like a masked API key — prevents accidental writeback */
function isMaskedApiKey(value: string | null | undefined): boolean {
  if (!value) return false
  return value === '***' || /^.{3}\.\.\..{4}$/.test(value)
}

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  profile: DEFAULT_PROFILE_PREFERENCES,
  studyDefaults: DEFAULT_STUDY_DEFAULTS,
  dashboard: DEFAULT_DASHBOARD_PREFERENCES,
  notifications: DEFAULT_NOTIFICATION_PREFERENCES,
  privacy: DEFAULT_PRIVACY_PREFERENCES,
  workspace: DEFAULT_WORKSPACE_PREFERENCES,
  ai: DEFAULT_AI_CONFIG,
}

// ============================================================================
// Conversion Functions
// ============================================================================

/**
 * Convert a database row to the UserPreferences object format.
 * Returns defaults if row is null.
 */
export function rowToPreferences(row: UserPreferencesRow | null): UserPreferences {
  if (!row) return DEFAULT_USER_PREFERENCES

  return {
    profile: {
      avatarUrl: row.avatar_url,
      displayNamePreference: row.display_name_preference || 'full_name',
    },
    studyDefaults: {
      branding: {
        primaryColor: row.default_primary_color || DEFAULT_STUDY_DEFAULTS_BRANDING.primaryColor,
        backgroundColor: row.default_background_color || DEFAULT_STUDY_DEFAULTS_BRANDING.backgroundColor,
        stylePreset: row.default_style_preset || DEFAULT_STUDY_DEFAULTS_BRANDING.stylePreset,
        radiusOption: row.default_radius_option || DEFAULT_STUDY_DEFAULTS_BRANDING.radiusOption,
        themeMode: row.default_theme_mode || DEFAULT_STUDY_DEFAULTS_BRANDING.themeMode,
        logoUrl: row.default_logo_url,
        logoSize: row.default_logo_size || DEFAULT_STUDY_DEFAULTS_BRANDING.logoSize,
      },
      settings: {
        language: row.default_language || DEFAULT_STUDY_DEFAULTS_SETTINGS.language,
        closingRuleType: row.default_closing_rule_type || DEFAULT_STUDY_DEFAULTS_SETTINGS.closingRuleType,
        maxParticipants: row.default_max_participants,
        responsePreventionLevel: row.default_response_prevention_level || DEFAULT_STUDY_DEFAULTS_SETTINGS.responsePreventionLevel,
      },
      notifications: {
        enabled: row.default_notifications_enabled ?? DEFAULT_STUDY_DEFAULTS_NOTIFICATIONS.enabled,
        everyResponse: row.default_notify_every_response ?? DEFAULT_STUDY_DEFAULTS_NOTIFICATIONS.everyResponse,
        milestones: row.default_notify_milestones ?? DEFAULT_STUDY_DEFAULTS_NOTIFICATIONS.milestones,
        milestoneValues: row.default_milestone_values || DEFAULT_STUDY_DEFAULTS_NOTIFICATIONS.milestoneValues,
        dailyDigest: row.default_notify_daily_digest ?? DEFAULT_STUDY_DEFAULTS_NOTIFICATIONS.dailyDigest,
        onClose: row.default_notify_on_close ?? DEFAULT_STUDY_DEFAULTS_NOTIFICATIONS.onClose,
      },
    },
    dashboard: {
      theme: row.dashboard_theme || DEFAULT_DASHBOARD_PREFERENCES.theme,
      tableDensity: row.dashboard_table_density || DEFAULT_DASHBOARD_PREFERENCES.tableDensity,
      showArchived: row.dashboard_show_archived ?? DEFAULT_DASHBOARD_PREFERENCES.showArchived,
    },
    notifications: {
      marketing: row.email_marketing ?? DEFAULT_NOTIFICATION_PREFERENCES.marketing,
      productUpdates: row.email_product_updates ?? DEFAULT_NOTIFICATION_PREFERENCES.productUpdates,
      securityAlerts: row.email_security_alerts ?? DEFAULT_NOTIFICATION_PREFERENCES.securityAlerts,
    },
    privacy: {
      analyticsEnabled: row.analytics_enabled ?? DEFAULT_PRIVACY_PREFERENCES.analyticsEnabled,
    },
    workspace: {
      lastActiveOrgId: row.last_active_org_id,
    },
    ai: {
      openai: {
        apiKeyMasked: maskApiKey(row.ai_openai_api_key),
        hasApiKey: !!row.ai_openai_api_key,
        baseUrl: row.ai_openai_base_url,
        model: row.ai_openai_model,
      },
      mercury: {
        apiKeyMasked: maskApiKey(row.ai_mercury_api_key),
        hasApiKey: !!row.ai_mercury_api_key,
        baseUrl: row.ai_mercury_base_url,
        model: row.ai_mercury_model,
      },
      useSameProvider: row.ai_use_same_provider ?? false,
    },
  }
}

/**
 * Convert a partial UserPreferences object to database row format for updates.
 * Only includes fields that are defined in the input.
 */
export function preferencesToRow(
  userId: string,
  prefs: DeepPartial<UserPreferences>
): Partial<UserPreferencesRow> {
  const row: Partial<UserPreferencesRow> = { user_id: userId }

  // Profile
  if (prefs.profile !== undefined) {
    if (prefs.profile.avatarUrl !== undefined) row.avatar_url = prefs.profile.avatarUrl
    if (prefs.profile.displayNamePreference !== undefined) row.display_name_preference = prefs.profile.displayNamePreference
  }

  // Study defaults - Branding
  if (prefs.studyDefaults?.branding !== undefined) {
    const b = prefs.studyDefaults.branding
    if (b.primaryColor !== undefined) row.default_primary_color = b.primaryColor
    if (b.backgroundColor !== undefined) row.default_background_color = b.backgroundColor
    if (b.stylePreset !== undefined) row.default_style_preset = b.stylePreset
    if (b.radiusOption !== undefined) row.default_radius_option = b.radiusOption
    if (b.themeMode !== undefined) row.default_theme_mode = b.themeMode
    if (b.logoUrl !== undefined) row.default_logo_url = b.logoUrl
    if (b.logoSize !== undefined) row.default_logo_size = b.logoSize
  }

  // Study defaults - Settings
  if (prefs.studyDefaults?.settings !== undefined) {
    const s = prefs.studyDefaults.settings
    if (s.language !== undefined) row.default_language = s.language
    if (s.closingRuleType !== undefined) row.default_closing_rule_type = s.closingRuleType
    if (s.maxParticipants !== undefined) row.default_max_participants = s.maxParticipants
    if (s.responsePreventionLevel !== undefined) row.default_response_prevention_level = s.responsePreventionLevel
  }

  // Study defaults - Notifications
  if (prefs.studyDefaults?.notifications !== undefined) {
    const n = prefs.studyDefaults.notifications
    if (n.enabled !== undefined) row.default_notifications_enabled = n.enabled
    if (n.everyResponse !== undefined) row.default_notify_every_response = n.everyResponse
    if (n.milestones !== undefined) row.default_notify_milestones = n.milestones
    if (n.milestoneValues !== undefined) row.default_milestone_values = n.milestoneValues
    if (n.dailyDigest !== undefined) row.default_notify_daily_digest = n.dailyDigest
    if (n.onClose !== undefined) row.default_notify_on_close = n.onClose
  }

  // Dashboard
  if (prefs.dashboard !== undefined) {
    const d = prefs.dashboard
    if (d.theme !== undefined) row.dashboard_theme = d.theme
    if (d.tableDensity !== undefined) row.dashboard_table_density = d.tableDensity
    if (d.showArchived !== undefined) row.dashboard_show_archived = d.showArchived
  }

  // Account notifications
  if (prefs.notifications !== undefined) {
    const n = prefs.notifications
    if (n.marketing !== undefined) row.email_marketing = n.marketing
    if (n.productUpdates !== undefined) row.email_product_updates = n.productUpdates
    if (n.securityAlerts !== undefined) row.email_security_alerts = n.securityAlerts
  }

  // Privacy
  if (prefs.privacy !== undefined) {
    if (prefs.privacy.analyticsEnabled !== undefined) row.analytics_enabled = prefs.privacy.analyticsEnabled
  }

  // Workspace
  if (prefs.workspace !== undefined) {
    if (prefs.workspace.lastActiveOrgId !== undefined) row.last_active_org_id = prefs.workspace.lastActiveOrgId
  }

  // AI model configuration
  const aiUpdate = (prefs as UserPreferencesUpdate).ai
  if (aiUpdate !== undefined) {
    if (aiUpdate.openai !== undefined) {
      if (aiUpdate.openai.apiKey !== undefined && !isMaskedApiKey(aiUpdate.openai.apiKey)) {
        row.ai_openai_api_key = aiUpdate.openai.apiKey
      }
      if (aiUpdate.openai.baseUrl !== undefined) row.ai_openai_base_url = aiUpdate.openai.baseUrl
      if (aiUpdate.openai.model !== undefined) row.ai_openai_model = aiUpdate.openai.model
    }
    if (aiUpdate.mercury !== undefined) {
      if (aiUpdate.mercury.apiKey !== undefined && !isMaskedApiKey(aiUpdate.mercury.apiKey)) {
        row.ai_mercury_api_key = aiUpdate.mercury.apiKey
      }
      if (aiUpdate.mercury.baseUrl !== undefined) row.ai_mercury_base_url = aiUpdate.mercury.baseUrl
      if (aiUpdate.mercury.model !== undefined) row.ai_mercury_model = aiUpdate.mercury.model
    }
    if (aiUpdate.useSameProvider !== undefined) row.ai_use_same_provider = aiUpdate.useSameProvider
  }

  return row
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Deep partial type for nested object updates.
 * Arrays are kept intact (not made partial) since we typically replace entire arrays.
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends (infer U)[]
    ? U[]
    : T[P] extends object
      ? DeepPartial<T[P]>
      : T[P]
}

/** Type for API update requests — ai uses the write shape (apiKey, not apiKeyMasked) */
export type UserPreferencesUpdate = DeepPartial<Omit<UserPreferences, 'ai'>> & {
  ai?: UserAiConfigUpdate
}
