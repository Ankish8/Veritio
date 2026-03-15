import type { TreeNode, Task, TreeTestSettings } from '@veritio/study-types'

// Re-export shared types for convenience
export type { PostTaskQuestionResponse } from '../shared/post-task-questions-screen'

export interface ResponsePreventionData {
  cookieId: string | null
  fingerprintHash: string | null
  fingerprintConfidence: number | null
}

export type TreeTestPhase =
  | 'instructions'            // Show tree test instructions (once at start)
  | 'recording_consent'       // Ask for recording permission (if enabled)
  | 'think_aloud_education'   // Show think-aloud education screen (if enabled)
  | 'task_active'             // Active tree navigation (timing starts here)
  | 'post_task_questions'     // Show post-task questions (if configured)
  | 'submitting'              // Submitting all responses
  | 'complete'                // All tasks done
  | 'error'                   // Error state

export interface TaskResult {
  taskId: string
  pathTaken: string[]           // Array of node IDs traversed
  selectedNodeId: string | null // Final answer (null if skipped)
  isCorrect: boolean
  isDirect: boolean             // No backtracks AND optimal path
  timeToFirstClickMs: number
  totalTimeMs: number
  backtrackCount: number
  skipped: boolean              // Whether task was skipped
}

export interface TreeTestPlayerProps {
  studyId: string
  shareCode: string
  tasks: Task[]
  nodes: TreeNode[]
  settings: TreeTestSettings
  welcomeMessage?: string
  thankYouMessage: string
  embeddedMode?: boolean
  previewMode?: boolean
  sessionToken?: string
  onComplete?: () => void
  preventionData?: ResponsePreventionData
}

export interface InstructionsScreenProps {
  onContinue: () => void
}

export interface TaskHeaderProps {
  taskNumber: number
  totalTasks: number
  question: string
  progress: number
  allowSkip: boolean
  onSkip: () => void
}

export interface TreeNavigationProps {
  nodes: TreeNode[]
  expandedNodeIds: string[]       // Array of currently expanded node IDs
  selectedNodeId: string | null   // Currently selected leaf node
  answerButtonText?: string
  onNodeToggle: (nodeId: string) => void     // Toggle expand/collapse for parent nodes
  onNodeSelect: (nodeId: string) => void     // Select/deselect a leaf node
  onConfirmAnswer: () => void                // Confirm the selected answer
}
