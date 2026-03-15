/**
 * Panel Widget Types
 *
 * Type definitions for advanced widget configuration components.
 */

// =============================================================================
// INTERCEPT WIDGET SETTINGS
// =============================================================================

export type WidgetPosition = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'center'
export type WidgetAnimation = 'slide' | 'fade' | 'scale' | 'bounce' | 'none'
export type DeviceMode = 'desktop' | 'mobile' | 'tablet'
export type PreviewDeviceMode = 'desktop' | 'mobile' | 'tablet'

export type WidgetStyle = 'popup' | 'drawer' | 'banner' | 'badge' | 'modal'
export type BannerPosition = 'top' | 'bottom'
export type SlideDirection = 'left' | 'right' | 'up' | 'down'
export type BadgePosition = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'right' | 'left'

export interface InterceptWidgetSettings {
  enabled?: boolean
  title?: string
  subtitle?: string
  description?: string
  buttonText?: string
  position?: WidgetPosition
  animation?: WidgetAnimation
  delay?: number
  showCloseButton?: boolean
  theme?: 'light' | 'dark' | 'auto'
  customCss?: string
  brandColor?: string
  backgroundColor?: string
  textColor?: string
  buttonColor?: string
  borderRadius?: number
  shadow?: 'none' | 'sm' | 'md' | 'lg'
  triggerType?: string
  triggerValue?: number
  widgetStyle?: WidgetStyle
  bannerPosition?: BannerPosition
  slideDirection?: SlideDirection
  badgePosition?: BadgePosition
  // Advanced settings (Phase 3)
  advancedTriggers?: AdvancedTriggers
  scheduling?: SchedulingSettings
  privacy?: PrivacySettings
  placement?: PlacementSettings
  frequencyCapping?: FrequencyCappingSettings
  targeting?: TargetingSettings
  copyPersonalization?: CopyPersonalization
}

// =============================================================================
// ADVANCED TRIGGERS
// =============================================================================

export type AdvancedTriggerType =
  | 'time_delay'
  | 'scroll_depth'
  | 'scroll_percentage'
  | 'exit_intent'
  | 'page_visits'
  | 'time_on_page'
  | 'url_pattern'
  | 'element_visible'

export interface TriggerRule {
  id: string
  type: AdvancedTriggerType
  enabled?: boolean
  value: number | string
  unit?: string
}

export interface AdvancedTriggers {
  enabled: boolean
  logic: 'and' | 'or' | 'AND' | 'OR'
  rules: TriggerRule[]
}

export const DEFAULT_ADVANCED_TRIGGERS: AdvancedTriggers = {
  enabled: false,
  logic: 'or',
  rules: [],
}

// =============================================================================
// FREQUENCY CAPPING
// =============================================================================

export interface FrequencyCappingSettings {
  enabled: boolean
  maxImpressions: number
  timeWindow: 'session' | 'day' | 'week' | 'month' | 'forever'
  cooldownMinutes: number
  respectDismissal: boolean
  dismissalCooldownDays: number
  hideAfterParticipation?: boolean
}

export const DEFAULT_FREQUENCY_CAPPING: FrequencyCappingSettings = {
  enabled: true,
  maxImpressions: 3,
  timeWindow: 'day',
  cooldownMinutes: 5,
  respectDismissal: true,
  dismissalCooldownDays: 7,
}

// =============================================================================
// VISITOR TARGETING
// =============================================================================

export interface TargetingSettings {
  enabled: boolean
  newVisitors: boolean
  returningVisitors: boolean
  excludeParticipants: boolean
  deviceTypes: ('desktop' | 'mobile' | 'tablet')[]
  excludeCountries: string[]
  includeCountries: string[]
  excludeUrlPatterns: string[]
  includeUrlPatterns: string[]
  minSessionDuration?: number
  minPageViews?: number
}

export const DEFAULT_TARGETING: TargetingSettings = {
  enabled: false,
  newVisitors: true,
  returningVisitors: true,
  excludeParticipants: true,
  deviceTypes: ['desktop', 'mobile', 'tablet'],
  excludeCountries: [],
  includeCountries: [],
  excludeUrlPatterns: [],
  includeUrlPatterns: [],
}

// =============================================================================
// SCHEDULING
// =============================================================================

export type TimezoneMode = 'visitor' | 'fixed' | 'user'

export interface BusinessHours {
  start: string
  end: string
}

export interface DateRange {
  start?: string
  end?: string
}

export interface SchedulingSettings {
  enabled: boolean
  businessHoursOnly: boolean
  businessHours: BusinessHours
  daysOfWeek: number[]
  dateRange: DateRange
  timezone: TimezoneMode
  fixedTimezone?: string
}

export const DEFAULT_SCHEDULING: SchedulingSettings = {
  enabled: false,
  businessHoursOnly: false,
  businessHours: {
    start: '09:00',
    end: '17:00',
  },
  daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
  dateRange: {},
  timezone: 'user',
}

// =============================================================================
// PLACEMENT
// =============================================================================

export type PlacementMode = 'automatic' | 'manual' | 'css_selector' | 'fixed' | 'inline' | 'sticky' | 'after_element' | 'custom'

export interface CustomCSSPosition {
  top?: string
  right?: string
  bottom?: string
  left?: string
  transform?: string
}

export interface PlacementSettings {
  mode: PlacementMode
  position: WidgetPosition
  offsetX: number
  offsetY: number
  zIndex: number
  cssSelector?: string
  containerPosition?: 'inside' | 'before' | 'after'
  customCSS?: CustomCSSPosition
}

export const DEFAULT_PLACEMENT: PlacementSettings = {
  mode: 'automatic',
  position: 'bottom-right',
  offsetX: 20,
  offsetY: 20,
  zIndex: 9999,
}

// =============================================================================
// PRIVACY SETTINGS
// =============================================================================

export type CookieConsentFramework = 'none' | 'cookiebot' | 'onetrust' | 'trustarc' | 'custom'

export interface CookieConsentSettings {
  enabled: boolean
  framework: CookieConsentFramework
  customCheckFunction?: string
  consentCategory?: string
}

export interface PrivacySettings {
  enabled: boolean
  respectDoNotTrack: boolean
  showPrivacyLink: boolean
  privacyLinkUrl?: string
  privacyLinkText?: string
  cookieConsent: CookieConsentSettings
  anonymizeData: boolean
  dataRetentionDays: number
}

export const DEFAULT_PRIVACY_SETTINGS: PrivacySettings = {
  enabled: false,
  respectDoNotTrack: true,
  showPrivacyLink: false,
  cookieConsent: {
    enabled: false,
    framework: 'none',
  },
  anonymizeData: false,
  dataRetentionDays: 365,
}

// =============================================================================
// COPY PERSONALIZATION
// =============================================================================

export type PersonalizationTrigger =
  | 'url_contains'
  | 'referrer_contains'
  | 'utm_source'
  | 'utm_campaign'
  | 'utm_medium'
  | 'device_type'
  | 'returning_visitor'
  | 'page_count'
  | 'scroll_depth_gt'
  | 'time_on_site_gt'

export interface PersonalizationRule {
  id: string
  trigger: PersonalizationTrigger
  value: string | number
  title?: string
  subtitle?: string
  buttonText?: string
  customTitle?: string
  customDescription?: string
  customButtonText?: string
  enabled?: boolean
}

export interface VariableSettings {
  enabled: boolean
  customVariables?: Record<string, string>
}

export interface CopyPersonalization {
  enabled: boolean
  rules: PersonalizationRule[]
  variables: VariableSettings
}

export const DEFAULT_COPY_PERSONALIZATION: CopyPersonalization = {
  enabled: false,
  rules: [],
  variables: {
    enabled: false,
  },
}

// =============================================================================
// COLOR ACCESSIBILITY
// =============================================================================

export interface ColorAccessibilitySettings {
  autoContrast: boolean
  wcagLevel: 'AA' | 'AAA'
  highContrastMode: boolean
  colorBlindMode: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia'
}

export const DEFAULT_COLOR_ACCESSIBILITY: ColorAccessibilitySettings = {
  autoContrast: true,
  wcagLevel: 'AA',
  highContrastMode: false,
  colorBlindMode: 'none',
}
