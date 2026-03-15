'use client'

import { useEffect, useState } from 'react'
import { BookOpen, GripVertical } from 'lucide-react'
import { STATUS_COLORS, OVERLAY_COLORS, BOX_SHADOWS } from '@veritio/core/colors'

interface TaskBottomBarProps {
  taskNumber: number
  totalTasks: number
  showProgress?: boolean
  allowSkip: boolean
  allowGiveUp?: boolean
  isFreeFlow?: boolean
  taskStarted: boolean
  isDraggable?: boolean
  onOpenInstructions: () => void
  onSkip: () => void
  onGiveUp?: () => void
  onStart: () => void
  onEndTask?: () => void
}
export function TaskBottomBar({
  taskNumber,
  totalTasks,
  showProgress = true,
  allowSkip,
  allowGiveUp = false,
  isFreeFlow = false,
  taskStarted,
  isDraggable = false,
  onOpenInstructions,
  onSkip,
  onGiveUp,
  onStart,
  onEndTask,
}: TaskBottomBarProps) {
  const [visible, setVisible] = useState(false)

  // Animate in on mount
  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(frame)
  }, [])

  const progressText = showProgress
    ? `${taskNumber}/${totalTasks}`
    : `${taskNumber}`

  return (
    <div
      className="pointer-events-auto flex items-center gap-1.5"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'scale(1)' : 'scale(0.97)',
        transition: 'opacity 200ms ease-out, transform 200ms ease-out',
        backgroundColor: 'var(--style-card-bg)',
        borderRadius: 'var(--style-radius)',
        boxShadow: BOX_SHADOWS.taskBar,
        border: '1px solid var(--style-card-border)',
        padding: '6px 6px 6px 14px',
        cursor: isDraggable ? 'grab' : undefined,
      }}
    >
      {/* Drag handle */}
      {isDraggable && (
        <GripVertical
          className="w-3.5 h-3.5 flex-shrink-0 -ml-1.5"
          style={{ color: 'var(--style-text-muted)', opacity: 0.4 }}
        />
      )}
      {/* Progress label */}
      <span
        className="text-[13px] font-semibold whitespace-nowrap"
        style={{ color: 'var(--style-text-muted)' }}
      >
        {progressText}
      </span>

      {/* Instructions button — bordered pill like Ballpark */}
      <button
        onClick={onOpenInstructions}
        className="flex items-center gap-1.5 text-[13px] font-medium px-3 py-1.5 transition-colors whitespace-nowrap"
        style={{
          color: 'var(--style-text-secondary)',
          backgroundColor: 'transparent',
          border: '1px solid var(--style-card-border)',
          borderRadius: 'var(--style-button-radius)',
        }}
      >
        <BookOpen className="w-3.5 h-3.5" />
        Open instructions
      </button>

      {/* Action buttons based on state */}
      {!taskStarted && (
        <button
          onClick={onStart}
          className="text-[13px] font-medium px-3.5 py-1.5 whitespace-nowrap transition-colors"
          style={{
            backgroundColor: 'var(--brand)',
            color: 'var(--brand-foreground)',
            borderRadius: 'var(--style-button-radius)',
          }}
        >
          Start task
        </button>
      )}

      {taskStarted && !isFreeFlow && allowGiveUp && (
        <button
          onClick={() => onGiveUp?.()}
          className="text-[13px] font-medium px-3.5 py-1.5 whitespace-nowrap transition-colors"
          style={{
            color: 'var(--style-text-secondary)',
            backgroundColor: 'transparent',
            border: '1px solid var(--style-card-border)',
            borderRadius: 'var(--style-button-radius)',
          }}
        >
          I&apos;m stuck
        </button>
      )}

      {taskStarted && !isFreeFlow && allowSkip && (
        <button
          onClick={onSkip}
          className="text-[13px] font-medium px-3.5 py-1.5 whitespace-nowrap transition-colors"
          style={{
            backgroundColor: 'var(--brand)',
            color: 'var(--brand-foreground)',
            borderRadius: 'var(--style-button-radius)',
          }}
        >
          Skip
        </button>
      )}

      {taskStarted && isFreeFlow && (
        <>
          <button
            onClick={() => onEndTask?.()}
            className="flex items-center gap-1.5 text-[13px] font-medium px-3 py-1.5 whitespace-nowrap transition-colors"
            style={{
              backgroundColor: STATUS_COLORS.destructive,
              color: OVERLAY_COLORS.white,
              borderRadius: 'var(--style-button-radius)',
            }}
          >
            <span
              className="w-2 h-2 rounded-sm flex-shrink-0"
              style={{ backgroundColor: OVERLAY_COLORS.white }}
            />
            End task
          </button>
        </>
      )}
    </div>
  )
}
