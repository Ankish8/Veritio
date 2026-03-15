'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown, GripHorizontal } from 'lucide-react'
import { STATUS_COLORS, OVERLAY_COLORS, BOX_SHADOWS } from '@veritio/core/colors'
import { BrandedButton } from '../../components/study-flow/step-layout'
import type { PanelCorner } from '../types'

interface TaskInstructionPanelProps {
  taskNumber: number
  totalTasks: number
  title: string
  instruction?: string | null
  taskStarted: boolean
  allowSkip: boolean
  allowGiveUp?: boolean
  showProgress?: boolean
  position?: PanelCorner
  isFreeFlow?: boolean
  isDraggable?: boolean
  onStart: () => void
  onSkip: () => void
  onGiveUp?: () => void
  onClose: () => void
  onEndTask?: () => void
}
export function TaskInstructionPanel({
  taskNumber,
  totalTasks,
  title,
  instruction,
  taskStarted,
  allowSkip,
  allowGiveUp = false,
  showProgress = true,
  isFreeFlow = false,
  isDraggable = false,
  onStart,
  onSkip,
  onGiveUp,
  onClose,
  onEndTask,
}: TaskInstructionPanelProps) {
  const [visible, setVisible] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(frame)
  }, [])

  // Count how many action buttons will be shown (to decide layout)
  const actionCount = (() => {
    if (!taskStarted) return (allowSkip ? 1 : 0) + 1 // skip? + start
    let count = 0
    if (isFreeFlow) count++
    if (allowSkip) count++
    if (allowGiveUp && !isFreeFlow) count++
    return count
  })()

  return (
    <div
      ref={panelRef}
      className="pointer-events-auto"
      style={{
        width: 'min(360px, calc(100% - 48px))',
        opacity: visible ? 1 : 0,
        transform: visible ? 'scale(1)' : 'scale(0.97)',
        transition: 'opacity 200ms ease-out, transform 200ms ease-out',
        backgroundColor: 'var(--style-card-bg)',
        borderRadius: 'var(--style-radius-lg)',
        boxShadow: BOX_SHADOWS.taskPanel,
        border: '1px solid var(--style-card-border)',
        overflow: 'hidden',
      }}
    >
      {/* Header — acts as drag handle when draggable */}
      <div
        className="flex items-center gap-2 px-4 py-2"
        style={{
          borderBottom: '1px solid var(--style-card-border)',
          cursor: isDraggable ? 'grab' : undefined,
        }}
      >
        {isDraggable && (
          <GripHorizontal
            className="w-4 h-4 flex-shrink-0"
            style={{ color: 'var(--style-text-muted)', opacity: 0.5 }}
          />
        )}
        <span
          className="text-[13px] font-semibold"
          style={{ color: 'var(--style-text-primary)' }}
        >
          Instructions
        </span>
        {showProgress && (
          <span
            className="text-[11px] font-medium px-1.5 py-0.5 rounded-full"
            style={{
              color: 'var(--style-text-muted)',
              backgroundColor: 'color-mix(in srgb, var(--style-card-bg) 90%, var(--style-text-muted))',
            }}
          >
            {taskNumber}/{totalTasks}
          </span>
        )}
        <div className="flex-1" />
        {taskStarted && (
          <button
            onClick={onClose}
            className="flex items-center gap-1 text-[12px] font-medium px-2.5 py-1 transition-colors"
            style={{
              color: 'var(--style-text-secondary)',
              backgroundColor: 'color-mix(in srgb, var(--style-card-bg) 88%, var(--style-text-muted))',
              border: '1px solid var(--style-card-border)',
              borderRadius: 'var(--style-button-radius)',
            }}
            aria-label="Hide instructions"
          >
            <ChevronDown className="w-3 h-3" />
            Hide
          </button>
        )}
      </div>

      {/* Body — entire section scrolls after max height */}
      <div className="relative">
        <div
          className="overflow-y-auto px-4 pt-3 pb-4"
          style={{ maxHeight: 280 }}
        >
          {/* Title — larger, readable */}
          <h3
            className="font-bold text-[17px] leading-snug"
            style={{ color: 'var(--style-text-primary)' }}
          >
            {title || 'Complete this task'}
          </h3>

          {/* Instruction — comfortable reading size */}
          {instruction && (
            <p
              className="mt-2 text-[14px] leading-relaxed"
              style={{ color: 'var(--style-text-secondary)' }}
            >
              {instruction}
            </p>
          )}
        </div>
        {/* Fade gradient at bottom of scroll area */}
        <div
          className="absolute bottom-0 left-0 right-0 h-6 pointer-events-none"
          style={{
            background: 'linear-gradient(transparent, var(--style-card-bg))',
          }}
        />
      </div>

      {/* Action bar — adapts to number of buttons */}
      <div
        className={`px-4 py-2.5 flex gap-2 ${actionCount === 1 ? 'justify-end' : ''}`}
        style={{ borderTop: '1px solid var(--style-card-border)' }}
      >
        {taskStarted ? (
          <>
            {isFreeFlow && (
              <button
                onClick={() => onEndTask?.()}
                className="flex items-center gap-1.5 text-[13px] font-medium px-3.5 py-2 transition-colors whitespace-nowrap"
                style={{ backgroundColor: STATUS_COLORS.destructive, color: OVERLAY_COLORS.white, borderRadius: 'var(--style-button-radius)' }}
              >
                <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: OVERLAY_COLORS.white }} />
                End task
              </button>
            )}
            {allowSkip && (
              <BrandedButton
                variant="outline"
                onClick={onSkip}
                className={`whitespace-nowrap ${actionCount > 1 ? 'flex-1' : ''}`}
                size="default"
              >
                Skip task
              </BrandedButton>
            )}
            {allowGiveUp && !isFreeFlow && (
              <BrandedButton
                variant="outline"
                onClick={() => onGiveUp?.()}
                className={`whitespace-nowrap ${actionCount > 1 ? 'flex-1' : ''}`}
                size="default"
              >
                I&apos;m stuck
              </BrandedButton>
            )}
          </>
        ) : (
          <>
            {allowSkip && (
              <BrandedButton
                variant="outline"
                onClick={onSkip}
                className="flex-1"
                size="default"
              >
                Skip task
              </BrandedButton>
            )}
            <BrandedButton
              onClick={onStart}
              className="flex-1"
              size="default"
            >
              Start task
            </BrandedButton>
          </>
        )}
      </div>
    </div>
  )
}
