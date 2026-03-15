'use client'

import { Trash2, Image as ImageIcon, ArrowLeft, Plus } from 'lucide-react'
import {
  Button,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  KeyboardShortcutHint,
  EscapeHint,
} from '@veritio/ui'
import type { PrototypeTestFrame } from '@veritio/study-types'
import { PathStepCard, formatVariantLabel } from './path-step-card'
import type { OverlayData } from './composite-thumbnail'

export interface ModalHeaderProps {
  modalTitle: string
  canSave: boolean
  saveTooltip: string | null
  onClose: () => void
  onSave: () => void
  portalContainer: HTMLElement | null
}

export function ModalHeader({ modalTitle, canSave, saveTooltip, onClose, onSave, portalContainer }: ModalHeaderProps) {
  return (
    <div className="h-12 flex items-center justify-between px-3 border-b bg-background flex-shrink-0">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-8 px-2 gap-1 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm">Back</span>
        </Button>
        <div className="h-5 w-px bg-border" />
        <span className="text-sm font-medium">{modalTitle}</span>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" className="h-8" onClick={onClose}>
          Cancel
          <EscapeHint />
        </Button>
        {saveTooltip ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex" tabIndex={0} aria-disabled="true">
                <Button size="sm" className="h-8" onClick={onSave} disabled>
                  Save
                  <KeyboardShortcutHint shortcut="cmd-enter" variant="dark" />
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent
              side="bottom"
              className="max-w-[260px]"
              portalContainer={portalContainer ?? undefined}
            >
              <p className="text-xs">{saveTooltip}</p>
            </TooltipContent>
          </Tooltip>
        ) : (
          <Button size="sm" className="h-8" onClick={onSave}>
            Save
            <KeyboardShortcutHint shortcut="cmd-enter" variant="dark" />
          </Button>
        )}
      </div>
    </div>
  )
}

export interface PathStepsSidebarProps {
  pathFrames: PrototypeTestFrame[]
  pathStartFrame: PrototypeTestFrame | null
  pathGoalFrame: PrototypeTestFrame | null
  pathMiddleFrames: PrototypeTestFrame[]
  pathFrameIds: string[]
  pathMode: string
  currentFrame: PrototypeTestFrame | null
  trackComponentStates: boolean
  changedComponentsPerStep: Record<number, string[]>
  handleClearPath: () => void
  openFrameSelector: (type: 'start' | 'goal') => void
  getStepVariantInfo: (index: number) => { variantName: string; componentSetName: string } | null
  getOverlaysForStep: (index: number, frame: PrototypeTestFrame) => OverlayData[]
  getFrameDimensions: (index: number, frame: PrototypeTestFrame) => { width: number; height: number } | null
}

export function PathStepsSidebar({
  pathFrames,
  pathStartFrame,
  pathGoalFrame,
  pathMiddleFrames,
  pathFrameIds,
  pathMode,
  currentFrame,
  trackComponentStates,
  changedComponentsPerStep,
  handleClearPath,
  openFrameSelector,
  getStepVariantInfo,
  getOverlaysForStep,
  getFrameDimensions,
}: PathStepsSidebarProps) {
  return (
    <div className="w-80 border-r bg-muted/30 flex flex-col flex-shrink-0">
      {/* Header */}
      <div className="px-4 py-3 border-b bg-background flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Path</h3>
        {pathFrames.length > 1 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearPath}
            className="h-7 text-xs text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-3 w-3 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Path steps list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* Empty state */}
        {pathFrames.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <ImageIcon className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              Click through the prototype to build your path
            </p>
          </div>
        )}

        {/* START card */}
        {pathStartFrame && (
          <PathStepCard
            frame={pathStartFrame}
            index={0}
            isStart
            isCurrent={currentFrame?.id === pathStartFrame.id}
            overlays={getOverlaysForStep(0, pathStartFrame)}
            frameWidth={getFrameDimensions(0, pathStartFrame)?.width}
            frameHeight={getFrameDimensions(0, pathStartFrame)?.height}
            hasComponentChange={trackComponentStates && (changedComponentsPerStep[0]?.length ?? 0) > 0}
          />
        )}

        {/* Add Goal button - when only Start frame exists */}
        {pathFrames.length === 1 && (
          <button
            type="button"
            onClick={() => openFrameSelector('goal')}
            className="w-full border-2 border-dashed border-muted-foreground/30 rounded-lg p-4 flex flex-col items-center justify-center gap-2 hover:border-primary/50 hover:bg-primary/5 transition-colors group"
          >
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
              <Plus className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <span className="text-sm font-medium text-muted-foreground group-hover:text-primary transition-colors">
              Set Goal Screen
            </span>
            <span className="text-xs text-muted-foreground/70">
              Or click through the prototype
            </span>
          </button>
        )}

        {/* Middle steps (only in Follow a Path / strict mode) */}
        {pathFrames.length > 1 && pathMode === 'strict' && (
          <>
            {pathMiddleFrames.map((frame, idx) => {
              const actualIndex = idx + 1
              const variantInfo = trackComponentStates ? getStepVariantInfo(actualIndex) : null
              const hasComponentChange = trackComponentStates && (changedComponentsPerStep[actualIndex]?.length ?? 0) > 0
              const prevFrame = actualIndex > 0 ? pathFrames[actualIndex - 1] : null
              const prevIndex = actualIndex - 1
              const prevOverlays = prevFrame ? getOverlaysForStep(prevIndex, prevFrame) : []
              const prevDims = prevFrame ? getFrameDimensions(prevIndex, prevFrame) : null
              return (
                <PathStepCard
                  key={`${frame.id}-${actualIndex}`}
                  frame={frame}
                  index={actualIndex}
                  isCurrent={currentFrame?.id === frame.id}
                  overlays={getOverlaysForStep(actualIndex, frame)}
                  frameWidth={getFrameDimensions(actualIndex, frame)?.width}
                  frameHeight={getFrameDimensions(actualIndex, frame)?.height}
                  variantLabel={formatVariantLabel(variantInfo)}
                  hasComponentChange={hasComponentChange}
                  previousFrame={prevFrame}
                  previousFrameOverlays={prevOverlays}
                  previousFrameWidth={prevDims?.width}
                  previousFrameHeight={prevDims?.height}
                />
              )
            })}

            {/* GOAL card */}
            {pathGoalFrame && (() => {
              const goalIndex = pathFrames.length - 1
              const goalPrevFrame = pathFrames.length > 1 ? pathFrames[pathFrames.length - 2] : null
              const goalPrevIndex = pathFrames.length - 2
              const goalPrevOverlays = goalPrevFrame ? getOverlaysForStep(goalPrevIndex, goalPrevFrame) : []
              const goalPrevDims = goalPrevFrame ? getFrameDimensions(goalPrevIndex, goalPrevFrame) : null
              const goalVariantInfo = trackComponentStates ? getStepVariantInfo(goalIndex) : null
              const hasComponentChange = trackComponentStates && (changedComponentsPerStep[goalIndex]?.length ?? 0) > 0
              return (
                <PathStepCard
                  frame={pathGoalFrame}
                  index={goalIndex}
                  isGoal
                  isCurrent={currentFrame?.id === pathGoalFrame.id}
                  overlays={getOverlaysForStep(goalIndex, pathGoalFrame)}
                  frameWidth={getFrameDimensions(goalIndex, pathGoalFrame)?.width}
                  frameHeight={getFrameDimensions(goalIndex, pathGoalFrame)?.height}
                  variantLabel={formatVariantLabel(goalVariantInfo)}
                  hasComponentChange={hasComponentChange}
                  previousFrame={goalPrevFrame}
                  previousFrameOverlays={goalPrevOverlays}
                  previousFrameWidth={goalPrevDims?.width}
                  previousFrameHeight={goalPrevDims?.height}
                />
              )
            })()}
          </>
        )}

        {/* GOAL card for flexible mode */}
        {pathFrames.length >= 2 && pathMode === 'flexible' && pathGoalFrame && (() => {
          const goalIndex = pathFrames.length - 1
          const flexGoalVariantInfo = trackComponentStates ? getStepVariantInfo(goalIndex) : null
          const hasComponentChange = trackComponentStates && (changedComponentsPerStep[goalIndex]?.length ?? 0) > 0
          const prevFrame = goalIndex > 0 ? pathFrames[goalIndex - 1] : null
          const prevIdx = goalIndex - 1
          return (
            <PathStepCard
              frame={pathGoalFrame}
              index={goalIndex}
              isGoal
              isCurrent={currentFrame?.id === pathGoalFrame.id}
              overlays={getOverlaysForStep(goalIndex, pathGoalFrame)}
              frameWidth={getFrameDimensions(goalIndex, pathGoalFrame)?.width}
              frameHeight={getFrameDimensions(goalIndex, pathGoalFrame)?.height}
              variantLabel={formatVariantLabel(flexGoalVariantInfo)}
              hasComponentChange={hasComponentChange}
              previousFrame={prevFrame}
              previousFrameOverlays={prevFrame ? getOverlaysForStep(prevIdx, prevFrame) : []}
              previousFrameWidth={prevFrame ? getFrameDimensions(prevIdx, prevFrame)?.width : undefined}
              previousFrameHeight={prevFrame ? getFrameDimensions(prevIdx, prevFrame)?.height : undefined}
            />
          )
        })()}
      </div>

      {/* Status at bottom of left panel */}
      <div className="px-4 py-3 border-t bg-background">
        {pathFrames.length < 2 ? (
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
            <p className="text-xs text-muted-foreground">
              Navigate to define path
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
            <p className="text-xs text-muted-foreground">
              {pathFrames.length} screens configured
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
