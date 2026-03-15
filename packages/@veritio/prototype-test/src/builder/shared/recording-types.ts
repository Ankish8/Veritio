export type RecordingCaptureMode = 'audio' | 'screen_and_audio' | 'video_and_audio' | 'screen_only' | 'video_only'

export type RecordingScope = 'session' | 'task'

export type ThinkAloudPromptPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

export interface ThinkAloudSettings {
  enabled: boolean
  showEducation: boolean
  silenceThresholdSeconds: number
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

export type ResponsePreventionLevel = 'none' | 'relaxed' | 'moderate' | 'strict'

export interface ResponsePreventionSettings {
  level: ResponsePreventionLevel
  allowRetakeAfterDays?: number
}

export const DEFAULT_RESPONSE_PREVENTION: ResponsePreventionSettings = {
  level: 'none',
  allowRetakeAfterDays: 0,
}
