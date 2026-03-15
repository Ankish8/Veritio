import type { ExtendedFirstImpressionSettings, FirstImpressionDesignQuestion } from '@veritio/study-types/study-flow-types'

export type FirstImpressionPhase =
  | 'recording_consent'  // Session recording consent (if enabled)
  | 'countdown'          // 3-2-1 countdown (configurable 0-5s)
  | 'exposure'           // Design shown for configured duration
  | 'practice_complete'  // Shown after practice round to confirm understanding
  | 'questions'          // Per-design questions
  | 'submitting'         // Sending responses to server
  | 'complete'           // Study finished
  | 'error'              // Error state

export interface FirstImpressionDesignWithQuestions {
  id: string
  name: string | null
  position: number
  image_url: string
  original_filename: string | null
  width: number | null
  height: number | null
  mobile_image_url: string | null
  mobile_width: number | null
  mobile_height: number | null
  display_mode: 'fit' | 'fill' | 'actual' | 'hidpi'
  background_color: string
  weight: number
  is_practice: boolean
  questions: FirstImpressionDesignQuestion[]
}

export interface ExposureEvent {
  designId: string
  exposureSequence: number // 1, 2, 3... order shown
  startedAt: number        // timestamp
  endedAt: number          // timestamp
  actualDurationMs: number // actual exposure time
  configuredDurationMs: number
  countdownDurationMs: number // countdown before this exposure
  viewportWidth: number
  viewportHeight: number
  imageRenderedWidth: number
  imageRenderedHeight: number
  usedMobileImage: boolean // whether mobile image was used
  focusEvents: FocusEvent[] // tab focus/blur events
}

export interface FocusEvent {
  type: 'focus' | 'blur'
  timestamp: number
}

export interface DesignResponse {
  designId: string
  exposure: ExposureEvent
  questionAnswers: Record<string, any> // questionId -> answer
  questionsStartedAt: number | null // timestamp when questions phase began
  completedAt: number // timestamp when questions phase completed
}

export interface FirstImpressionPlayerProps {
  studyId: string
  shareCode: string
  designs: FirstImpressionDesignWithQuestions[]
  settings: ExtendedFirstImpressionSettings
  embeddedMode?: boolean
  previewMode?: boolean
  sessionToken?: string
  participantId?: string
  onComplete?: () => void
  preventionData?: ResponsePreventionData
}

interface ResponsePreventionData {
  cookieId: string | null
  fingerprintHash: string | null
  fingerprintConfidence: number | null
}

export interface DeviceInfo {
  deviceType: 'desktop' | 'tablet' | 'mobile'
  userAgent: string
  viewportWidth: number
  viewportHeight: number
}
