'use client'

import { memo, useMemo, useState } from 'react'
import {
  GripVertical,
  Trash2,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Plus,
  Clock,
  HelpCircle,
  Route,
} from 'lucide-react'
import {
  Button,
  Input,
  Label,
  Textarea,
  Badge,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  Switch,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  cn,
} from '@veritio/ui'
import { PresenceBadge, PresenceRing } from '../components/yjs'
import { useCollaborativeField } from '@veritio/yjs'
import type { FlowType } from './compact-flow-type-selector'
import type { StateSuccessCriteriaConfig } from './state-success-criteria'
import type {
  PrototypeTestTask,
  PrototypeTestFrame,
  PrototypeTestPrototype,
  SuccessPathway,
  PostTaskQuestion,
} from '@veritio/study-types'
import { castJsonArray } from '@veritio/core'
import {
  hasValidPathsV3,
  getPrimaryPathV3,
  getPathCount,
  stepsToPositionFrames,
} from '../lib/utils/pathway-migration'
import {
  CompositeThumbnail,
  computePathOverlays,
  isOverlayFrame,
  type ComponentVariantData,
  type ComponentInstanceData,
  type OverlayData,
} from './composite-thumbnail'

// Extended task type to include state_success_criteria (pending migration)
type TaskWithStateSuccessCriteria = PrototypeTestTask & {
  state_success_criteria?: StateSuccessCriteriaConfig | null
}

interface TaskItemProps {
  task: TaskWithStateSuccessCriteria
  studyId: string
  index: number
  frames: PrototypeTestFrame[]
  prototype: PrototypeTestPrototype | null
  componentVariants: ComponentVariantData[]
  componentInstances: ComponentInstanceData[]
  onUpdate: (updates: Partial<PrototypeTestTask>) => void
  onDelete: () => void
  onConfigureTaskFlow: () => void
  onOpenPostTaskQuestions: () => void
  dragHandleProps?: Record<string, unknown>
  isDragging?: boolean
}

// Custom comparison for memo - properly compare nested pathway data
function areTaskItemPropsEqual(prevProps: TaskItemProps, nextProps: TaskItemProps): boolean {
  // Compare task fields that affect rendering
  const prevPathway = JSON.stringify(prevProps.task.success_pathway)
  const nextPathway = JSON.stringify(nextProps.task.success_pathway)
  const prevQuestions = JSON.stringify(prevProps.task.post_task_questions)
  const nextQuestions = JSON.stringify(nextProps.task.post_task_questions)

  if (prevPathway !== nextPathway) return false
  if (prevQuestions !== nextQuestions) return false
  if (prevProps.task.id !== nextProps.task.id) return false
  if (prevProps.task.title !== nextProps.task.title) return false
  if (prevProps.task.instruction !== nextProps.task.instruction) return false
  if (prevProps.task.start_frame_id !== nextProps.task.start_frame_id) return false
  if (prevProps.task.flow_type !== nextProps.task.flow_type) return false
  if (prevProps.task.time_limit_ms !== nextProps.task.time_limit_ms) return false
  if (prevProps.prototype?.figma_url !== nextProps.prototype?.figma_url) return false
  if (prevProps.index !== nextProps.index) return false
  if (prevProps.isDragging !== nextProps.isDragging) return false
  if (prevProps.frames !== nextProps.frames) return false
  if (prevProps.componentVariants !== nextProps.componentVariants) return false
  if (prevProps.componentInstances !== nextProps.componentInstances) return false

  return true
}

export const TaskItem = memo(function TaskItem({
  task,
  studyId,
  index,
  frames,
  prototype,
  componentVariants,
  componentInstances,
  onUpdate,
  onDelete,
  onConfigureTaskFlow,
  onOpenPostTaskQuestions,
  dragHandleProps,
  isDragging = false,
}: TaskItemProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  // Collaborative presence
  const { hasPresence, primaryUser, users, wrapperProps } = useCollaborativeField({
    locationId: `${studyId}:prototype-task:${task.id}`,
  })

  // Get post-task questions count for the badge
  const postTaskQuestions = castJsonArray<PostTaskQuestion>(task.post_task_questions)

  // Check if task flow is configured (has pathway)
  const hasPathway = hasValidPathsV3(task.success_pathway as SuccessPathway)
  const startFrame = frames.find((f) => f.id === task.start_frame_id)

  // Get pathway details for preview
  const primaryPath = getPrimaryPathV3(task.success_pathway as SuccessPathway)
  const pathCount = getPathCount(task.success_pathway as SuccessPathway)
  const pathFrameIds = primaryPath?.steps ? stepsToPositionFrames(primaryPath.steps) : (primaryPath?.frames || [])
  const pathFrames = pathFrameIds
    .map((id) => frames.find((f) => f.id === id))
    .filter(Boolean) as PrototypeTestFrame[]
  const goalFrame = pathFrames.length > 0 ? pathFrames[pathFrames.length - 1] : null

  // Compute composite overlays for frames that have component state steps
  const pathOverlays = useMemo(() => {
    if (!primaryPath?.steps?.length || !componentVariants.length || !componentInstances.length) {
      return new Map<number, OverlayData[]>()
    }
    return computePathOverlays(primaryPath.steps, frames, componentVariants, componentInstances)
  }, [primaryPath?.steps, frames, componentVariants, componentInstances])

  const isFreeFlow = task.flow_type === 'free_flow'
  const hasTimeLimit = task.time_limit_ms != null && task.time_limit_ms > 0
  const timeLimitMinutes = task.time_limit_ms ? Math.round(task.time_limit_ms / 1000 / 60) : 2

  return (
    <div
      className={cn(
        'relative rounded-lg bg-card border border-border',
        isDragging && 'opacity-50 ring-2 ring-primary'
      )}
      {...wrapperProps}
    >
      {/* Collaborative presence indicators */}
      {hasPresence && primaryUser && (
        <>
          <PresenceRing color={primaryUser.color} className="rounded-lg" />
          <PresenceBadge user={primaryUser} otherCount={users.length - 1} size="sm" />
        </>
      )}
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        {/* Clean Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50">
          {/* Drag handle - subtle */}
          <div
            {...dragHandleProps}
            className="cursor-grab active:cursor-grabbing text-muted-foreground/50 hover:text-muted-foreground transition-colors"
          >
            <GripVertical className="h-4 w-4" />
          </div>

          {/* Task number - pill style */}
          <span className="flex-shrink-0 text-xs font-medium text-muted-foreground bg-muted/50 px-2 py-0.5 rounded">
            {index + 1}
          </span>

          {/* Title preview (read-only in header) */}
          <span className="flex-1 text-sm font-medium truncate text-foreground">
            {task.title || 'Untitled Task'}
          </span>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                {isExpanded ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
              </Button>
            </CollapsibleTrigger>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Two-Column Layout Content */}
        <CollapsibleContent>
          <div className="p-5">
            {/* Two Column Grid */}
            <div className="grid grid-cols-2 gap-6 items-stretch">
              {/* Left Column - Title & Instructions */}
              <div className="flex flex-col gap-4">
                {/* Title */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Title</Label>
                  <Input
                    value={task.title}
                    onChange={(e) => onUpdate({ title: e.target.value })}
                    placeholder="e.g., Find the checkout page"
                    className="h-9"
                  />
                </div>

                {/* Instruction */}
                <div className="flex-1 flex flex-col space-y-1.5">
                  <Label className="text-sm font-medium">Instructions</Label>
                  <Textarea
                    value={task.instruction || ''}
                    onChange={(e) => onUpdate({ instruction: e.target.value })}
                    placeholder={
                      isFreeFlow
                        ? 'Describe what participants should explore...'
                        : 'Describe the goal participants should accomplish...'
                    }
                    className="resize-none flex-1 min-h-[120px]"
                  />
                </div>
              </div>

              {/* Right Column - Task Type & Flow Preview */}
              <div className="flex flex-col gap-3 min-w-0">
                {/* Task Type */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm font-medium">Task Type</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="text-muted-foreground/50 hover:text-muted-foreground">
                          <HelpCircle className="h-3.5 w-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs">
                        <p className="text-xs">
                          <strong>Task Flow:</strong> Participant follows a path to reach a target screen.
                          <br /><br />
                          <strong>Free Exploration:</strong> Participant explores freely without a defined goal.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onUpdate({ flow_type: 'task_flow' })}
                      className={cn(
                        'px-3 py-1.5 text-sm rounded-md border transition-colors',
                        !isFreeFlow
                          ? 'bg-foreground text-background border-foreground font-medium'
                          : 'bg-transparent text-muted-foreground border-border hover:border-muted-foreground hover:text-foreground'
                      )}
                    >
                      Task Flow
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdate({ flow_type: 'free_flow' })}
                      className={cn(
                        'px-3 py-1.5 text-sm rounded-md border transition-colors',
                        isFreeFlow
                          ? 'bg-foreground text-background border-foreground font-medium'
                          : 'bg-transparent text-muted-foreground border-border hover:border-muted-foreground hover:text-foreground'
                      )}
                    >
                      Free Exploration
                    </button>
                  </div>
                </div>

                {/* Success Path or Time Limit based on type */}
                {!isFreeFlow ? (
                  /* Task Flow - Show path config */
                  <div className="flex-1 flex flex-col space-y-1.5 min-w-0">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Success Path</Label>
                      {hasPathway && (
                        <button
                          type="button"
                          onClick={onConfigureTaskFlow}
                          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          Edit
                        </button>
                      )}
                    </div>
                    {hasPathway ? (
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={onConfigureTaskFlow}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onConfigureTaskFlow() }}
                        className="w-full min-w-0 overflow-hidden rounded-lg border border-border bg-muted/30 p-2 hover:bg-muted/50 transition-colors group cursor-pointer"
                      >
                        <div
                          className="py-1"
                          style={{ overflowX: 'auto', scrollbarWidth: 'thin' }}
                          onWheel={(event) => {
                            const target = event.currentTarget
                            if (target.scrollWidth <= target.clientWidth) return
                            if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return
                            const maxScrollLeft = target.scrollWidth - target.clientWidth
                            if (event.deltaY < 0 && target.scrollLeft <= 0) return
                            if (event.deltaY > 0 && target.scrollLeft >= maxScrollLeft) return
                            target.scrollLeft += event.deltaY
                            event.preventDefault()
                            event.stopPropagation()
                          }}
                        >
                          <div className="flex items-center gap-3 w-max"
                          >
                          {pathFrames.map((frame, index) => {
                            const overlays = pathOverlays.get(index) || []
                            const hasOverlays = overlays.length > 0 && frame.thumbnail_url
                            const previousFrame = index > 0 ? pathFrames[index - 1] : null
                            const isOverlay = index > 0 && previousFrame && isOverlayFrame(frame, previousFrame)
                            return (
                              <div key={`${frame.id}-${index}`} className="flex items-center gap-3 flex-shrink-0">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="w-44 aspect-[4/3] rounded-lg border border-border bg-background overflow-hidden shadow-sm group-hover:border-muted-foreground/50 group-hover:shadow transition-all">
                                      {isOverlay && previousFrame?.thumbnail_url && frame.thumbnail_url ? (
                                        /* Overlay frame compositing — show overlay centered on previous frame */
                                        <div className="relative w-full h-full">
                                          {/* Base frame (previous screen) — with its own component overlays if any */}
                                          {(() => {
                                            const prevOverlays = pathOverlays.get(index - 1) || []
                                            return prevOverlays.length > 0 ? (
                                              <CompositeThumbnail
                                                baseImageUrl={previousFrame.thumbnail_url!}
                                                overlays={prevOverlays}
                                                frameWidth={previousFrame.width || 1440}
                                                frameHeight={previousFrame.height || 900}
                                                className="w-full h-full"
                                              />
                                            ) : (
                                              <img
                                                src={previousFrame.thumbnail_url}
                                                alt={previousFrame.name}
                                                className="w-full h-full object-contain"
                                              />
                                            )
                                          })()}
                                          {/* Overlay frame centered with scrim */}
                                          <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="absolute inset-0 bg-black/30" />
                                            <img
                                              src={frame.thumbnail_url}
                                              alt={frame.name}
                                              className="relative z-10 max-w-[80%] max-h-[80%] object-contain shadow-2xl rounded-lg"
                                              style={{
                                                maxWidth: frame.width && previousFrame.width
                                                  ? `${Math.min(80, (frame.width / previousFrame.width) * 100)}%`
                                                  : '80%',
                                                maxHeight: frame.height && previousFrame.height
                                                  ? `${Math.min(80, (frame.height / previousFrame.height) * 100)}%`
                                                  : '80%',
                                              }}
                                            />
                                          </div>
                                        </div>
                                      ) : hasOverlays ? (
                                        <CompositeThumbnail
                                          baseImageUrl={frame.thumbnail_url!}
                                          overlays={overlays}
                                          frameWidth={frame.width || 1440}
                                          frameHeight={frame.height || 900}
                                          className="w-full h-full"
                                        />
                                      ) : frame.thumbnail_url ? (
                                        <img
                                          src={frame.thumbnail_url}
                                          alt={frame.name}
                                          className="w-full h-full object-cover"
                                        />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-muted">
                                          <Route className="h-5 w-5 text-muted-foreground/30" />
                                        </div>
                                      )}
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent side="bottom" className="text-xs">
                                    {frame.name}
                                    {isOverlay && previousFrame && (
                                      <span className="block text-muted-foreground">
                                        overlay on {previousFrame.name}
                                      </span>
                                    )}
                                    {overlays.length > 0 && (
                                      <span className="block text-muted-foreground">
                                        + {overlays.map(o => o.variantLabel).join(', ')}
                                      </span>
                                    )}
                                  </TooltipContent>
                                </Tooltip>
                                {index < pathFrames.length - 1 && (
                                  <span className="text-muted-foreground/30 text-lg">→</span>
                                )}
                              </div>
                            )
                          })}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={onConfigureTaskFlow}
                        className="flex-1 w-full px-4 rounded-md border border-border bg-muted/20 hover:bg-muted/40 hover:border-muted-foreground/30 transition-colors flex flex-col items-center justify-center gap-2 group cursor-pointer"
                      >
                        <Route className="h-8 w-8 text-muted-foreground/30 group-hover:text-muted-foreground/50 transition-colors" />
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                            Set up success path
                          </p>
                          <p className="text-xs text-muted-foreground/70 mt-0.5">
                            Define start → goal screens
                          </p>
                        </div>
                      </button>
                    )}
                  </div>
                ) : (
                  /* Free Exploration - Show time limit */
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Time limit</span>
                    <Switch
                      checked={hasTimeLimit}
                      onCheckedChange={(enabled) => {
                        onUpdate({ time_limit_ms: enabled ? 120000 : null })
                      }}
                    />
                    {hasTimeLimit && (
                      <>
                        <Input
                          type="number"
                          min={1}
                          max={30}
                          value={timeLimitMinutes}
                          onChange={(e) => {
                            const mins = parseInt(e.target.value) || 2
                            onUpdate({ time_limit_ms: mins * 60 * 1000 })
                          }}
                          className="w-14 h-8 text-sm text-center"
                        />
                        <span className="text-sm text-muted-foreground">min</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Post-task Questions - Full Width */}
            <div className="mt-5 pt-4 border-t border-border/50">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Post-task Questions</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Optional follow-up questions after the task
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onOpenPostTaskQuestions}
                  className="h-8"
                >
                  {postTaskQuestions.length > 0 ? (
                    <>
                      Edit
                      <Badge variant="secondary" className="ml-1.5 h-5 px-1.5">
                        {postTaskQuestions.length}
                      </Badge>
                    </>
                  ) : (
                    <>
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Add
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}, areTaskItemPropsEqual)
