import type { ComponentType } from 'react'
import type {
  PrototypeTestPrototype,
  PrototypeTestFrame,
  PrototypeTestTask,
  PrototypeTestSettings,
  PrototypeScaleMode,
} from '@veritio/study-types'
import type { ComponentStateEvent, ComponentStateSnapshot } from '@veritio/study-types/study-flow-types'
import type { PostTaskQuestionsScreenProps } from '../shared/post-task-questions-screen'

export type PrototypeTestPhase =
  | 'instructions'
  | 'recording_consent'
  | 'think_aloud_education'
  | 'task_active'
  | 'post_task_questions'
  | 'submitting'
  | 'complete'
  | 'error'

export type TaskPanelState = 'loading' | 'initial' | 'active'

export type PanelCorner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

export interface TaskResult {
  taskId: string
  taskAttemptId?: string
  outcome: 'success' | 'failure' | 'skipped'
  pathTaken: string[]
  followedCorrectPath?: boolean
  totalTimeMs: number
  timeToFirstClickMs: number
  clickCount: number
  misclickCount: number
  backtrackCount: number
}

export interface ClickEvent {
  taskId: string
  frameId: string
  x: number
  y: number
  timestamp: number
  wasHotspot: boolean
  triggeredTransition: boolean
  timeSinceFrameLoadMs: number
  componentStates?: ComponentStateSnapshot
}

export interface PrototypeComponentInstancePosition {
  instanceId: string
  frameNodeId: string
  relativeX: number
  relativeY: number
  width?: number
  height?: number
}
export type PrototypeComponentInstanceInput =
  | PrototypeComponentInstancePosition
  | {
      instance_id: string
      frame_node_id: string
      relative_x: number
      relative_y: number
      width?: number | null
      height?: number | null
    }

export interface NavigationEvent {
  taskId: string
  fromFrameId: string | null
  toFrameId: string
  triggeredBy: 'click' | 'hotspot' | 'back' | 'start'
  timeOnFromFrameMs: number
  sequenceNumber: number
  timestamp: number
}

export interface ComponentStateEventRecord {
  taskId: string
  frameId: string | null
  componentNodeId: string
  fromVariantId: string | null
  toVariantId: string
  isTimedChange: boolean
  sequenceNumber: number
  timestamp: number
}

export interface FigmaClickEvent {
  x: number
  y: number
  wasHotspot: boolean
  triggeredTransition: boolean
  targetNodeId?: string
  nearestScrollingFrameId?: string
  targetNodeX?: number
  targetNodeY?: number
}

export interface FigmaNavigationEvent {
  fromNodeId: string | null
  toNodeId: string
}

export interface ResponsePreventionData {
  cookieId: string | null
  fingerprintHash: string | null
  fingerprintConfidence: number | null
}

export interface PrototypeTestPlayerProps {
  studyId: string
  shareCode: string
  prototype: PrototypeTestPrototype | null | undefined
  frames: PrototypeTestFrame[]
  componentInstances?: PrototypeComponentInstanceInput[]
  tasks: PrototypeTestTask[]
  settings: PrototypeTestSettings
  embeddedMode?: boolean
  previewMode?: boolean
  sessionToken?: string
  participantId?: string
  onComplete?: () => void
  preventionData?: ResponsePreventionData
  PostTaskQuestionsComponent?: ComponentType<PostTaskQuestionsScreenProps>
}

export interface FigmaEmbedProps {
  prototype: PrototypeTestPrototype
  currentFrameId?: string | null
  taskKey?: string | number
  showHotspotHints?: boolean
  scaleMode?: PrototypeScaleMode
  onLoad?: () => void
  onError?: (error: string) => void
  onNavigate?: (event: FigmaNavigationEvent) => void
  onClick?: (event: FigmaClickEvent) => void
  onStateChange?: (event: ComponentStateEvent) => void
  onStateSnapshot?: (snapshot: ComponentStateSnapshot) => void
  className?: string
}

export interface TaskHeaderProps {
  taskNumber: number
  totalTasks: number
  instruction: string
  progress: number
  showProgress: boolean
  allowSkip: boolean
  onSkip: () => void
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  isOverlay?: boolean
}

export interface TaskInstructionOverlayProps {
  taskNumber: number
  totalTasks: number
  title: string
  instruction: string
  onStart: () => void
}

export interface TaskPanelProps {
  taskNumber: number
  totalTasks: number
  title: string
  instruction?: string
  taskStarted?: boolean
  allowSkip: boolean
  showProgress?: boolean
  position?: PanelCorner
  onStart: () => void
  onSkip: () => void
  onResume?: () => void
}

export interface CollapsedTaskIndicatorProps {
  taskNumber: number
  position: PanelCorner
  onPositionChange?: (position: PanelCorner) => void
  onExpand?: () => void
}

export interface SuccessModalProps {
  open: boolean
  onContinue: () => void
}

export interface SkipConfirmationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

export type { PostTaskQuestionResponse, PostTaskQuestionsScreenProps } from '../shared/post-task-questions-screen'

export interface TaskQuestionResponses {
  taskId: string
  responses: import('../shared/post-task-questions-screen').PostTaskQuestionResponse[]
}
