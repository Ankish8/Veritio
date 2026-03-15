import type { ThinkAloudSettings, EyeTrackingSettings } from '@/components/builders/shared/types'

export type LiveWebsitePhase =
  | 'recording-consent'
  | 'think-aloud-education'
  | 'eye-tracking-calibration'
  | 'recording-controller'
  | 'task-instructions'
  | 'task-active'
  | 'post-task-questions'
  | 'complete'

export interface UrlPathStep {
  id: string
  type: 'navigation' | 'click'
  pathname: string
  fullUrl: string
  label: string
  selector?: string
  elementText?: string
  group?: string   // Steps with same group ID = unordered set
}

export interface UrlSuccessPath {
  version: 1
  mode: 'strict' | 'flexible'
  steps: UrlPathStep[]
}

export interface LiveWebsiteTask {
  id: string
  title: string
  instructions: string
  target_url: string
  success_url: string | null
  success_criteria_type: 'self_reported' | 'url_match' | 'exact_path'
  success_path: UrlSuccessPath | null
  time_limit_seconds: number | null
  order_position: number
  post_task_questions: unknown
}

export type WidgetPosition = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'

export interface LiveWebsiteSettings {
  mode: 'url_only' | 'snippet' | 'reverse_proxy'
  websiteUrl: string
  snippetId: string | null
  recordScreen: boolean
  recordWebcam: boolean
  recordMicrophone: boolean
  allowMobile: boolean
  allowSkipTasks: boolean
  showTaskProgress: boolean
  defaultTimeLimitSeconds: number | null
  authInstructions: string | null
  widgetPosition: WidgetPosition
  blockBeforeStart: boolean
  completionButtonText?: string
  abTestingEnabled?: boolean
  thinkAloud?: ThinkAloudSettings
  eyeTracking?: EyeTrackingSettings
}

export interface TaskResponse {
  taskId: string
  status: 'completed' | 'abandoned' | 'timed_out' | 'skipped'
  startedAt: string | null
  completedAt: string | null
  durationMs: number | null
  postTaskResponses?: Array<{ questionId: string; value: unknown }>
}
