// Shared Player Screens
export { WelcomeScreen } from './screens/welcome-screen'
export { RecordingConsentScreen } from './screens/recording-consent-screen'
export { ThinkAloudEducationScreen } from './screens/think-aloud-education-screen'
export { EyeTrackingCalibrationScreen } from './screens/eye-tracking-calibration-screen'
export {
  ScreenLayout,
  ErrorScreenBase,
  CompleteScreenBase,
  SubmittingScreenBase,
} from './screens/screen-layout'
export type {
  ErrorScreenBaseProps,
  CompleteScreenBaseProps,
  SubmittingScreenBaseProps,
} from './screens/screen-layout'

// Recording Components
export { RecordingIndicator } from './recording/recording-indicator'
export { AudioLevelIndicator } from './recording/audio-level-indicator'
export { ThinkAloudPrompt } from './recording/think-aloud-prompt'

export type {
  FlowStep,
  FlowSection,
  QuestionResponse,
  ResponseValue,
  StudyMeta,
  StudyType,
} from '../types'

export {
  ACTIVITY_STEP_ORDER,
  SURVEY_STEP_ORDER,
  getStepOrder,
} from '../types'
