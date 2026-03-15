/**
 * Widget Loader Configuration Types
 *
 * Defines the shape of configuration passed to the loader script generator.
 */

export interface LoaderConfig {
  embedCodeId: string
  apiBase: string
  studyUrl: string
  config: WidgetConfig
  branding: WidgetBranding
}

export interface WidgetConfig {
  enabled?: boolean
  position?: string
  triggerType?: string
  triggerValue?: number
  title?: string
  description?: string
  buttonText?: string
  // Widget style settings
  widgetStyle?: 'popup' | 'drawer' | 'modal' | 'banner' | 'badge'
  animation?: string
  slideDirection?: 'left' | 'right'
  bannerPosition?: 'top' | 'bottom'
  badgePosition?: 'left' | 'right'
  frequencyCapping?: FrequencyCappingConfig
  captureSettings?: CaptureSettingsConfig
  // Extended settings
  targeting?: TargetingConfig
  scheduling?: SchedulingConfig
  privacy?: PrivacyConfig
  advancedTriggers?: AdvancedTriggersConfig
  placement?: PlacementConfig
  copyPersonalization?: CopyPersonalizationConfig
}

export interface FrequencyCappingConfig {
  enabled?: boolean
  maxImpressions?: number
  timeWindow?: string
}

export interface CaptureSettingsConfig {
  collectEmail?: boolean
  collectDemographics?: boolean
  demographicFields?: Array<string | DemographicFieldConfig>
  fieldOptions?: Record<string, unknown>
  submitButtonText?: string
}

export interface DemographicFieldConfig {
  id: string
  fieldType: string
  required?: boolean
  width?: string
  label?: string
}

export interface TargetingConfig {
  newVisitors?: boolean
  returningVisitors?: boolean
  excludeParticipants?: boolean
}

export interface SchedulingConfig {
  enabled?: boolean
  businessHoursOnly?: boolean
  businessHours?: { start?: string; end?: string }
  daysOfWeek?: number[]
  dateRange?: { start?: string; end?: string }
  timezone?: 'user' | 'fixed'
  fixedTimezone?: string
}

export interface PrivacyConfig {
  respectDoNotTrack?: boolean
  showPrivacyLink?: boolean
  privacyLinkUrl?: string
  privacyLinkText?: string
  cookieConsent?: CookieConsentConfig
}

export interface CookieConsentConfig {
  enabled?: boolean
  framework?: 'onetrust' | 'cookiebot' | 'custom'
  customCheckFunction?: string
}

export interface AdvancedTriggersConfig {
  enabled?: boolean
  rules?: Array<TriggerRule>
  logic?: 'AND' | 'OR'
}

export interface TriggerRule {
  id: string
  type: string
  value: number | string
  operator?: string
}

export interface PlacementConfig {
  mode?: 'fixed' | 'inline' | 'sticky' | 'after_element' | 'custom'
  cssSelector?: string
  customCSS?: {
    top?: string
    right?: string
    bottom?: string
    left?: string
    transform?: string
  }
}

export interface CopyPersonalizationConfig {
  enabled?: boolean
  rules?: Array<PersonalizationRule>
  variables?: {
    enabled?: boolean
    customVariables?: Record<string, string>
  }
}

export interface PersonalizationRule {
  id: string
  trigger: string
  value: string | number
  customTitle?: string
  customDescription?: string
  customButtonText?: string
}

export interface WidgetBranding {
  themeMode: 'light' | 'dark' | 'system'
  primaryColor: string
  radiusOption: 'none' | 'small' | 'default' | 'large'
}

/** Normalized demographic field (for internal use) */
export interface NormalizedDemographicField {
  id: string
  fieldType: string
  required: boolean
  width: string
  label: string
}

/** Theme colors computed from branding settings */
export interface ThemeColors {
  bgColor: string
  textColor: string
  inputBg: string
  inputBorder: string
  isDark: boolean
}
