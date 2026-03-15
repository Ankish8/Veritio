'use client'

import { useCallback } from 'react'
import { OVERLAY_COLORS } from '@veritio/core/colors'
import type { PanelCorner } from '../types'
import { TaskInstructionPanel } from './task-instruction-panel'
import { TaskBottomBar } from './task-bottom-bar'
import { useDraggable } from './use-draggable'

interface TaskOverlayProps {
  taskNumber: number
  totalTasks: number
  title: string
  instruction?: string | null
  taskStarted: boolean
  isExpanded: boolean
  allowSkip: boolean
  allowGiveUp?: boolean
  showProgress?: boolean
  position?: PanelCorner
  isFreeFlow?: boolean
  onStart: () => void
  onSkip: () => void
  onGiveUp?: () => void
  onResume: () => void
  onToggleExpand: (expanded: boolean) => void
  onEndTask?: () => void
}
function getCornerStyle(position: PanelCorner): React.CSSProperties {
  switch (position) {
    case 'top-left':
      return { top: 0, left: 0 }
    case 'top-right':
      return { top: 0, right: 0 }
    case 'bottom-left':
      return { bottom: 0, left: 0 }
    case 'bottom-right':
      return { bottom: 0, right: 0 }
    default:
      return { top: 0, left: 0 }
  }
}
function getCornerClasses(position: PanelCorner): string {
  switch (position) {
    case 'top-left':
      return 'items-start justify-start'
    case 'top-right':
      return 'items-start justify-end'
    case 'bottom-left':
      return 'items-end justify-start'
    case 'bottom-right':
      return 'items-end justify-end'
    default:
      return 'items-start justify-start'
  }
}
export function TaskOverlay({
  taskNumber,
  totalTasks,
  title,
  instruction,
  taskStarted,
  isExpanded,
  allowSkip,
  allowGiveUp = false,
  showProgress = true,
  position = 'top-left',
  isFreeFlow = false,
  onStart,
  onSkip,
  onGiveUp,
  onResume,
  onToggleExpand,
  onEndTask,
}: TaskOverlayProps) {
  const { position: dragPos, isDragging, handleMouseDown, handleTouchStart } = useDraggable({
    enabled: taskStarted,
  })

  const handleStart = useCallback(() => {
    onToggleExpand(false)
    onStart()
  }, [onToggleExpand, onStart])

  const handleSkip = useCallback(() => {
    onToggleExpand(false)
    onSkip()
  }, [onToggleExpand, onSkip])

  const handleGiveUp = useCallback(() => {
    onToggleExpand(false)
    onGiveUp?.()
  }, [onToggleExpand, onGiveUp])

  const handleEndTask = useCallback(() => {
    onToggleExpand(false)
    onEndTask?.()
  }, [onToggleExpand, onEndTask])

  const handleClose = useCallback(() => {
    onToggleExpand(false)
  }, [onToggleExpand])

  const handleOpen = useCallback(() => {
    onToggleExpand(true)
  }, [onToggleExpand])

  const cornerClasses = getCornerClasses(position)

  // Compute corner-based CSS position for initial placement before any drag
  const cornerStyle = getCornerStyle(position)

  // After task started: always render draggable wrapper.
  // Before first drag (dragPos === null), use CSS corner positioning.
  // After first drag, use absolute pixel positioning from dragPos.
  const hasDragged = dragPos !== null

  const widgetContent = isExpanded ? (
    <TaskInstructionPanel
      taskNumber={taskNumber}
      totalTasks={totalTasks}
      title={title}
      instruction={instruction}
      taskStarted={taskStarted}
      allowSkip={allowSkip}
      allowGiveUp={allowGiveUp}
      showProgress={showProgress}
      position={position}
      isFreeFlow={isFreeFlow}
      onStart={handleStart}
      onSkip={handleSkip}
      onGiveUp={handleGiveUp}
      onClose={handleClose}
      onEndTask={handleEndTask}
      isDraggable={taskStarted}
    />
  ) : (
    <TaskBottomBar
      taskNumber={taskNumber}
      totalTasks={totalTasks}
      showProgress={showProgress}
      allowSkip={allowSkip}
      allowGiveUp={allowGiveUp}
      isFreeFlow={isFreeFlow}
      taskStarted={taskStarted}
      onOpenInstructions={handleOpen}
      onSkip={handleSkip}
      onGiveUp={handleGiveUp}
      onStart={handleStart}
      onEndTask={handleEndTask}
      isDraggable={taskStarted}
    />
  )

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Blocking backdrop before task starts — prevents interaction with prototype */}
      {!taskStarted && (
        <div
          className="absolute inset-0 z-20 pointer-events-auto"
          style={{ backgroundColor: isExpanded ? OVERLAY_COLORS.backdropLight : 'transparent' }}
        />
      )}

      {taskStarted ? (
        // Draggable wrapper — always rendered after task start
        <div
          className="absolute z-30"
          style={hasDragged
            ? { left: dragPos.x, top: dragPos.y }
            : cornerStyle
          }
        >
          <div
            data-draggable
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            className="p-4"
            style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
          >
            {widgetContent}
          </div>
        </div>
      ) : (
        // Pre-start: flex-pinned to corner, not draggable
        <div className={`absolute inset-0 z-30 flex p-4 ${cornerClasses}`}>
          {widgetContent}
        </div>
      )}
    </div>
  )
}
