export type FirstClickPhase =
  | 'instructions'            // Study instructions screen
  | 'recording_consent'       // Session recording consent (if enabled)
  | 'think_aloud_education'   // Think-aloud education screen (if enabled)
  | 'task_intro'              // Task instruction + "Start task" button
  | 'task_active'             // Image displayed, waiting for click
  | 'post_task_questions'     // Post-task questions (if configured)
  | 'submitting'              // Sending responses to server
  | 'complete'                // Study finished
  | 'error'                   // Error state

export interface ClickData {
  x: number              // 0-1 normalized to image
  y: number              // 0-1 normalized to image
  viewportWidth: number
  viewportHeight: number
  imageRenderedWidth: number
  imageRenderedHeight: number
}

export interface ClickResponse extends ClickData {
  timeToClickMs: number
  isCorrect: boolean
  matchedAoiId: string | null
}
