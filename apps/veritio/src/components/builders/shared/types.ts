import type { ReactNode } from 'react'
import type { ClosingRule as CoreClosingRule, ClosingRuleType as CoreClosingRuleType } from '@veritio/core'
import { DEFAULT_CLOSING_RULE as CORE_DEFAULT_CLOSING_RULE } from '@veritio/core'

// Re-exports from @veritio/core
export type ClosingRule = CoreClosingRule
export type ClosingRuleType = CoreClosingRuleType
export const DEFAULT_CLOSING_RULE = CORE_DEFAULT_CLOSING_RULE

// --- Study Types ---

export type StudyType = 'card_sort' | 'tree_test' | 'survey' | 'prototype_test' | 'first_click' | 'first_impression' | 'preference_test' | 'live_website_test'

export type StudyStatus = 'draft' | 'active' | 'paused' | 'completed'

// --- File Attachments ---

export interface FileAttachment {
  id: string
  url: string
  filename: string
  size: number
  mimeType: string
  uploadedAt: string
}

// --- Response Prevention ---

/**
 * Protection level for duplicate response prevention
 * - none: Disabled, anyone can take multiple times
 * - relaxed: Cookie-based tracking (easy to bypass with incognito)
 * - moderate: Cookie + IP tracking (harder to bypass, may flag shared networks)
 * - strict: Browser fingerprinting via FingerprintJS (hardest to bypass)
 */
export type ResponsePreventionLevel = 'none' | 'relaxed' | 'moderate' | 'strict'

export interface ResponsePreventionSettings {
  level: ResponsePreventionLevel
  allowRetakeAfterDays?: number // 0 = never allow retakes
}

export const DEFAULT_RESPONSE_PREVENTION: ResponsePreventionSettings = {
  level: 'none',
  allowRetakeAfterDays: 0,
}

// --- Session Recording ---

/**
 * - audio: Microphone only (works on mobile)
 * - screen_and_audio: Screen + microphone (desktop only via getDisplayMedia)
 * - video_and_audio: Screen + microphone + webcam overlay (desktop only)
 * - screen_only: Screen without microphone (desktop only)
 * - video_only: Screen + webcam without microphone (desktop only)
 */
export type RecordingCaptureMode = 'audio' | 'screen_and_audio' | 'video_and_audio' | 'screen_only' | 'video_only'

/**
 * - session: One continuous recording for the entire study session
 * - task: Separate recording for each task (prototype tests only)
 */
export type RecordingScope = 'session' | 'task'

export type ThinkAloudPromptPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

export interface ThinkAloudSettings {
  enabled: boolean
  showEducation: boolean
  /** Silence duration threshold in seconds before showing prompt */
  silenceThresholdSeconds: number
  /** Audio level threshold (0-1 normalized) for detecting speech */
  audioLevelThreshold: number
  promptPosition: ThinkAloudPromptPosition
  customPrompts?: string[]
}

export const DEFAULT_THINK_ALOUD: ThinkAloudSettings = {
  enabled: false,
  showEducation: true,
  silenceThresholdSeconds: 8,
  audioLevelThreshold: 0.15,
  promptPosition: 'top-right',
}

export interface EyeTrackingSettings {
  enabled: boolean
  showCalibration: boolean
}

export const DEFAULT_EYE_TRACKING: EyeTrackingSettings = {
  enabled: false,
  showCalibration: true,
}

export const DEFAULT_THINK_ALOUD_PROMPTS: string[] = [
  'What are you thinking right now?',
  'Can you describe what you\'re looking at?',
  'What are you trying to do?',
  'Tell us what\'s on your mind.',
]

export interface SessionRecordingSettings {
  enabled: boolean
  captureMode: RecordingCaptureMode
  recordingScope: RecordingScope
  privacyNotice?: string[]
  transcriptionLanguage?: string
  thinkAloud?: ThinkAloudSettings
}

export const DEFAULT_PRIVACY_NOTICE: string[] = [
  'Your recording will be used for research purposes only',
  'Data will be stored securely and never shared publicly',
  'You can request deletion of your recording at any time',
  'Only the research team will have access to your recording',
]

export const DEFAULT_SESSION_RECORDING: SessionRecordingSettings = {
  enabled: false,
  captureMode: 'audio',
  recordingScope: 'session',
  transcriptionLanguage: 'auto',
}

/**
 * Supported transcription languages with Deepgram nova-3 model.
 * 'auto' uses 'multi' mode for code-switching (e.g., Hindi-English).
 */
export const TRANSCRIPTION_LANGUAGES = [
  { code: 'auto', label: 'Multilingual (Recommended)', flag: '🌐' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'es', label: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', label: 'French', flag: '🇫🇷' },
  { code: 'de', label: 'German', flag: '🇩🇪' },
  { code: 'pt', label: 'Portuguese', flag: '🇵🇹' },
  { code: 'it', label: 'Italian', flag: '🇮🇹' },
  { code: 'nl', label: 'Dutch', flag: '🇳🇱' },
  { code: 'pl', label: 'Polish', flag: '🇵🇱' },
  { code: 'ru', label: 'Russian', flag: '🇷🇺' },
  { code: 'ja', label: 'Japanese', flag: '🇯🇵' },
  { code: 'ko', label: 'Korean', flag: '🇰🇷' },
  { code: 'zh', label: 'Chinese', flag: '🇨🇳' },
  { code: 'hi', label: 'Hindi', flag: '🇮🇳' },
  { code: 'ar', label: 'Arabic', flag: '🇸🇦' },
  { code: 'sv', label: 'Swedish', flag: '🇸🇪' },
  { code: 'da', label: 'Danish', flag: '🇩🇰' },
  { code: 'no', label: 'Norwegian', flag: '🇳🇴' },
  { code: 'fi', label: 'Finnish', flag: '🇫🇮' },
  { code: 'tr', label: 'Turkish', flag: '🇹🇷' },
] as const

// --- Email Notifications ---

export const NOTIFICATION_MILESTONES = [10, 50, 100, 500, 1000] as const

export interface NotificationTriggers {
  everyResponse: boolean
  milestones: {
    enabled: boolean
    values: number[]
  }
  dailyDigest: boolean
  onClose: boolean
}

export interface NotificationSettings {
  enabled: boolean
  triggers: NotificationTriggers
  maxEmailsPerHour: number
  milestonesReached: number[]
}

export const DEFAULT_NOTIFICATION_TRIGGERS: NotificationTriggers = {
  everyResponse: false,
  milestones: {
    enabled: true,
    values: [10, 50, 100, 500, 1000],
  },
  dailyDigest: false,
  onClose: true,
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: false,
  triggers: DEFAULT_NOTIFICATION_TRIGGERS,
  maxEmailsPerHour: 10,
  milestonesReached: [],
}

// --- Sharing / Intercept Widget ---

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

// --- Advanced Intercept Features ---

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
  end: string
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
  daysOfWeek: number[] // 0-6 (Sunday-Saturday), empty = all days
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

export interface AnalysisSubSections {
  // Card sort
  cards?: boolean
  categories?: boolean
  similarity?: boolean
  standardization?: boolean
  // Tree test
  taskResults?: boolean
  pathAnalysis?: boolean
  // Post-task (all types)
  postTaskQuestions?: boolean
}

export interface SharedMetrics {
  overview: boolean
  participants: boolean
  analysis: boolean
  questionnaire: boolean
  aiInsights?: boolean
  analysisSubSections?: AnalysisSubSections
}

export interface PublicResultsSettings {
  enabled: boolean
  password?: string
  passwordHash?: string
  expiresAt?: string
  viewCount?: number
  lastViewedAt?: string
  allowComments?: boolean
  sharedMetrics: SharedMetrics
}

export interface SharingSettings {
  redirects?: RedirectSettings
  intercept?: InterceptWidgetSettings
  publicResults?: PublicResultsSettings
}

// --- Sharing / Intercept Defaults ---

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
  businessHours: { start: '09:00', end: '17:00' },
  daysOfWeek: [],
  dateRange: {},
  timezone: 'user',
}

export const DEFAULT_COPY_PERSONALIZATION: CopyPersonalization = {
  enabled: false,
  rules: [],
  variables: { enabled: false },
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
  cookieConsent: { enabled: false, framework: 'custom' },
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

// --- Branding ---

export interface BrandingImage {
  url: string
  filename: string
  size?: number
}

export const LOGO_SIZE_MIN = 24
export const LOGO_SIZE_MAX = 80
export const LOGO_SIZE_DEFAULT = 48
export const LOGO_PREVIEW_SCALE = 0.65

/**
 * Style preset identifier.
 * Each preset defines a distinct visual personality for participant UI.
 */
export type StylePresetId =
  | 'default' // Clean, professional
  | 'vega'    // Bold, high-contrast
  | 'nova'    // Soft, rounded
  | 'maia'    // Minimal, flat
  | 'lyra'    // Elegant, refined
  | 'mira'    // Playful, vibrant

export type RadiusOption = 'none' | 'small' | 'default' | 'large'
export type ThemeMode = 'light' | 'dark' | 'system'

export interface BrandingSettings {
  logo?: BrandingImage
  logoSize?: number
  socialImage?: BrandingImage
  primaryColor?: string
  backgroundColor?: string
  buttonText?: {
    continue?: string
    finished?: string
  }
  cardSortInstructions?: string
  stylePreset?: StylePresetId
  radiusOption?: RadiusOption
  themeMode?: ThemeMode
}

// --- Study Meta ---

export interface StudyMeta {
  title: string
  description: string | null
  purpose: string | null
  participantRequirements: string | null
  folderId: string | null
  fileAttachments: FileAttachment[]
  urlSlug: string | null
  language: string
  password: string | null
  sessionRecordingSettings: SessionRecordingSettings
  closingRule: ClosingRule
  responsePrevention: ResponsePreventionSettings
  notificationSettings: NotificationSettings
  branding: BrandingSettings
  sharingSettings: SharingSettings
  status: StudyStatus
  createdAt: string
  updatedAt: string | null
  launchedAt: string | null
  participantCount: number
}

// --- Builder Tab Types ---

export type BuilderTabId =
  | 'details'
  | 'content'
  | 'cards'
  | 'categories'
  | 'tree'
  | 'tasks'
  | 'prototype'
  | 'prototype-tasks'
  | 'first-click-tasks'
  | 'first-impression-designs'
  | 'first-impression-questions'
  | 'live-website-tasks'
  | 'live-website-setup'
  | 'study-flow'
  | 'settings'
  | 'branding'
  | 'sharing'

export interface BuilderTab {
  id: BuilderTabId
  label: string
  icon?: ReactNode
  component: ReactNode
  badge?: number | string
  disabled?: boolean
  /** Keep tab mounted when switching away (preserves state, scroll, iframes) */
  keepMounted?: boolean
}

// --- Shared Tab Component Props ---

export interface SharedTabProps {
  studyId: string
  studyType: StudyType
  isReadOnly?: boolean
}

export interface DetailsTabProps extends SharedTabProps {
  showFileAttachments?: boolean
  maxFileSize?: number
}

export interface SettingsTabProps extends SharedTabProps {
  baseUrl?: string
}

export interface BrandingTabProps extends SharedTabProps {
  allowLogoUpload?: boolean
  allowColorCustomization?: boolean
}

export interface SharingTabProps extends SharedTabProps {
  shareCode?: string
  urlSlug?: string | null
  isBuilder?: boolean
  baseUrl?: string
}

// --- Builder Shell Props ---

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export interface PresenceUserInfo {
  id: string
  name?: string
  email?: string
  avatarUrl?: string
}

export interface BuilderShellProps {
  studyId: string
  studyType: StudyType
  studyTitle: string
  projectId: string
  projectName?: string
  shareCode?: string
  tabs: BuilderTab[]
  defaultTab?: BuilderTabId
  activeTab: BuilderTabId
  onTabChange: (tab: BuilderTabId) => void
  onSave: () => Promise<unknown>
  isDirty: boolean
  saveStatus: SaveStatus
  lastSavedAt: number | null
  isStoreHydrated?: boolean
  presenceUsers?: PresenceUserInfo[]
  isRealtimeConnected?: boolean
  onPreviewClick?: () => void
  onLaunchClick?: () => void
  isLaunching?: boolean
  studyStatus?: StudyStatus
  /** When true, shows a shimmer overlay on the tab content area (AI refresh in progress) */
  isRefreshingContent?: boolean
  /** When true, hides save/launch UI and blocks auto-save (viewer role) */
  isReadOnly?: boolean
}

// --- Upload Types ---

export interface UploadOptions {
  bucket: string
  path: string
  maxSize?: number
  allowedTypes?: string[]
  onProgress?: (progress: number) => void
}

export interface UploadResult {
  url: string
  filename: string
  size: number
  mimeType: string
}

// --- Form Field Types ---

export { LANGUAGE_OPTIONS as SUPPORTED_LANGUAGES, type LanguageOption } from '@/i18n/config'

// --- Default Values ---

export const DEFAULT_BRANDING: BrandingSettings = {
  themeMode: 'light',
  stylePreset: 'default',
  radiusOption: 'default',
}

export const DEFAULT_STUDY_META: StudyMeta = {
  title: '',
  description: null,
  purpose: null,
  participantRequirements: null,
  folderId: null,
  fileAttachments: [],
  urlSlug: null,
  language: 'en-US',
  password: null,
  sessionRecordingSettings: DEFAULT_SESSION_RECORDING,
  closingRule: DEFAULT_CLOSING_RULE,
  responsePrevention: DEFAULT_RESPONSE_PREVENTION,
  notificationSettings: DEFAULT_NOTIFICATION_SETTINGS,
  branding: DEFAULT_BRANDING,
  sharingSettings: DEFAULT_SHARING_SETTINGS,
  status: 'draft',
  createdAt: new Date().toISOString(),
  updatedAt: null,
  launchedAt: null,
  participantCount: 0,
}

// --- Utility Types ---

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}
