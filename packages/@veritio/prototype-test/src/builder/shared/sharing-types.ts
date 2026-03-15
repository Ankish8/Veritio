export type InterceptPosition = 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right'

export type InterceptTriggerType = 'time_delay' | 'scroll_percentage' | 'exit_intent'

export interface InterceptScreeningQuestion {
  question: string
  options: string[]
  correctOption?: number
}

export type FrequencyTimeWindow = 'day' | 'week' | 'month' | 'forever'

export interface FrequencyCappingSettings {
  enabled: boolean
  maxImpressions: number
  timeWindow: FrequencyTimeWindow
  hideAfterParticipation: boolean
}

export interface TargetingSettings {
  newVisitors: boolean
  returningVisitors: boolean
  excludeParticipants: boolean
}

export type AdvancedTriggerType =
  | 'time_delay'
  | 'scroll_percentage'
  | 'exit_intent'
  | 'page_visits'
  | 'time_on_page'
  | 'url_pattern'
  | 'element_visible'

export type TriggerOperator = 'equals' | 'greater_than' | 'less_than' | 'contains' | 'matches'

export interface TriggerRule {
  id: string
  type: AdvancedTriggerType
  value: number | string
  operator?: TriggerOperator
}

export interface AdvancedTriggers {
  enabled: boolean
  rules: TriggerRule[]
  logic: 'AND' | 'OR'
}

export type WidgetStyle = 'popup' | 'banner' | 'modal' | 'drawer' | 'badge'
export type BannerPosition = 'top' | 'bottom'
export type SlideDirection = 'left' | 'right' | 'top' | 'bottom'
export type BadgePosition = 'left' | 'right'
export type WidgetAnimation = 'fade' | 'slide' | 'zoom' | 'bounce'

export type TimeIcon = 'clock' | 'timer' | 'hourglass'
export type IncentiveIcon = 'gift' | 'dollar' | 'star' | 'trophy'

export interface WidgetMetadata {
  showEstimatedTime: boolean
  estimatedMinutes?: number
  estimatedIcon?: TimeIcon
  showIncentive: boolean
  incentiveText?: string
  incentiveIcon?: IncentiveIcon
}

export interface BusinessHours {
  start: string // HH:MM 24h format
  end: string // HH:MM 24h format
}

export interface DateRange {
  start?: string
  end?: string
}

export type TimezoneMode = 'user' | 'fixed'

export interface SchedulingSettings {
  enabled: boolean
  businessHoursOnly: boolean
  businessHours: BusinessHours
  daysOfWeek: number[] // 0=Sunday through 6=Saturday
  dateRange: DateRange
  timezone: TimezoneMode
  fixedTimezone?: string // IANA timezone
}

export type PersonalizationTrigger =
  | 'url_contains'
  | 'referrer_contains'
  | 'scroll_depth_gt'
  | 'time_on_site_gt'

export interface PersonalizationRule {
  id: string
  trigger: PersonalizationTrigger
  value: string | number
  customTitle?: string
  customDescription?: string
  customButtonText?: string
}

export interface CopyPersonalization {
  enabled: boolean
  rules: PersonalizationRule[]
  variables: {
    enabled: boolean
    customVariables?: Record<string, string>
  }
}

export type PlacementMode = 'fixed' | 'inline' | 'sticky' | 'after_element' | 'custom'

export interface CustomCSS {
  top?: string
  right?: string
  bottom?: string
  left?: string
  transform?: string
}

export interface PlacementSettings {
  mode: PlacementMode
  cssSelector?: string
  customCSS?: CustomCSS
}

export type CookieConsentFramework = 'onetrust' | 'cookiebot' | 'custom'

export interface CookieConsentSettings {
  enabled: boolean
  framework: CookieConsentFramework
  customCheckFunction?: string
}

export interface PrivacySettings {
  showPrivacyLink: boolean
  privacyLinkUrl?: string
  privacyLinkText?: string
  requireConsent: boolean
  respectDoNotTrack: boolean
  cookieConsent: CookieConsentSettings
}

export interface InterceptWidgetSettings {
  enabled: boolean
  position: InterceptPosition
  triggerType: InterceptTriggerType
  triggerValue?: number
  backgroundColor: string
  textColor: string
  buttonColor: string
  title: string
  description: string
  buttonText: string
  screeningQuestion?: InterceptScreeningQuestion
  themeMode?: 'light' | 'dark' | 'system'
  borderRadius?: number
  frequencyCapping?: FrequencyCappingSettings
  targeting?: TargetingSettings
  advancedTriggers?: AdvancedTriggers
  widgetStyle?: WidgetStyle
  bannerPosition?: BannerPosition
  slideDirection?: SlideDirection
  badgePosition?: BadgePosition
  animation?: WidgetAnimation
  metadata?: WidgetMetadata
  scheduling?: SchedulingSettings
  copyPersonalization?: CopyPersonalization
  placement?: PlacementSettings
  privacy?: PrivacySettings

  captureSettings?: {
    collectEmail?: boolean
    collectDemographics?: boolean
    demographicFields?: Array<string | { fieldType: string; required: boolean; enabled: boolean }>
  }
  embedCodeId?: string
}

export interface RedirectSettings {
  completionUrl?: string
  screenoutUrl?: string
  quotaFullUrl?: string
  redirectDelay?: number
}

export interface SharedMetrics {
  overview: boolean
  participants: boolean
  analysis: boolean
  questionnaire: boolean
}

export interface PublicResultsSettings {
  enabled: boolean
  password?: string
  expiresAt?: string
  sharedMetrics: SharedMetrics
}

export type LinkAnalyticsSource = 'qr_code' | 'email' | 'widget' | 'direct' | 'custom'

export type LinkAnalyticsEventType = 'view' | 'start' | 'complete' | 'screenout' | 'quota_full'

export interface SharingSettings {
  redirects?: RedirectSettings
  intercept?: InterceptWidgetSettings
  publicResults?: PublicResultsSettings
  autoAddToPanel?: boolean
  panelInviteTag?: string
}

export const DEFAULT_FREQUENCY_CAPPING: FrequencyCappingSettings = {
  enabled: false,
  maxImpressions: 3,
  timeWindow: 'day',
  hideAfterParticipation: true,
}

export const DEFAULT_TARGETING: TargetingSettings = {
  newVisitors: false,
  returningVisitors: false,
  excludeParticipants: true,
}

export const DEFAULT_ADVANCED_TRIGGERS: AdvancedTriggers = {
  enabled: false,
  rules: [],
  logic: 'AND',
}

export const DEFAULT_WIDGET_METADATA: WidgetMetadata = {
  showEstimatedTime: false,
  estimatedMinutes: 5,
  estimatedIcon: 'clock',
  showIncentive: false,
  incentiveText: '',
  incentiveIcon: 'gift',
}

export const DEFAULT_SCHEDULING: SchedulingSettings = {
  enabled: false,
  businessHoursOnly: false,
  businessHours: {
    start: '09:00',
    end: '17:00',
  },
  daysOfWeek: [],
  dateRange: {},
  timezone: 'user',
}

export const DEFAULT_COPY_PERSONALIZATION: CopyPersonalization = {
  enabled: false,
  rules: [],
  variables: {
    enabled: false,
  },
}

export const DEFAULT_PLACEMENT: PlacementSettings = {
  mode: 'fixed',
}

export const DEFAULT_PRIVACY_SETTINGS: PrivacySettings = {
  showPrivacyLink: false,
  privacyLinkUrl: '',
  privacyLinkText: 'Privacy Policy',
  requireConsent: false,
  respectDoNotTrack: false,
  cookieConsent: {
    enabled: false,
    framework: 'custom',
  },
}

export const DEFAULT_INTERCEPT_SETTINGS: InterceptWidgetSettings = {
  enabled: false,
  position: 'bottom-right',
  triggerType: 'time_delay',
  triggerValue: 5,
  backgroundColor: '#ffffff',
  textColor: '#000000',
  buttonColor: '#000000',
  title: 'Help us improve!',
  description: 'Share your feedback to help us improve.',
  buttonText: 'Get Started',
}

export const DEFAULT_REDIRECT_SETTINGS: RedirectSettings = {
  redirectDelay: 5,
}

export const DEFAULT_SHARED_METRICS: SharedMetrics = {
  overview: true,
  participants: true,
  analysis: true,
  questionnaire: true,
}

export const DEFAULT_PUBLIC_RESULTS_SETTINGS: PublicResultsSettings = {
  enabled: false,
  sharedMetrics: DEFAULT_SHARED_METRICS,
}

export const DEFAULT_SHARING_SETTINGS: SharingSettings = {}
