export * from './types'
export * from './defaults'

export {
  type FlowSectionConfig,
  ACTIVITY_FLOW_SECTIONS,
  SURVEY_FLOW_SECTIONS,
  getFlowSectionsForType,
} from './builder'

export {
  WelcomeScreen,
  RecordingConsentScreen,
  ThinkAloudEducationScreen,
  ScreenLayout,
  RecordingIndicator,
  AudioLevelIndicator,
  ThinkAloudPrompt,
} from './player'

export { useSessionRecording } from './hooks/use-session-recording'
export { useRecordingEventCapture } from './hooks/use-recording-event-capture'
export { useSilenceDetection } from './hooks/use-silence-detection'
export { useThinkAloudPrompts } from './hooks/use-think-aloud-prompts'
export { useActivitySession } from './hooks/use-activity-session'
export { useRecordingCapabilities } from './hooks/use-recording-capabilities'
export { useRecordingStore } from './stores/recording-store'
