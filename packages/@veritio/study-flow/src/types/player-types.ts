export type ThinkAloudPromptPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

export type RecordingCaptureMode = 'audio' | 'screen_and_audio' | 'video_and_audio'

export const DEFAULT_PRIVACY_NOTICE = `Your privacy is important to us. Session recordings are used solely for research purposes and will be securely stored. We do not share recordings with third parties. You can request deletion of your recordings at any time by contacting us.`

export const DEFAULT_THINK_ALOUD_PROMPTS = [
  "What are you thinking right now?",
  "Can you tell me what's on your mind?",
  "What are you looking at?",
  "What are you trying to do?",
  "Is anything confusing you?",
]
