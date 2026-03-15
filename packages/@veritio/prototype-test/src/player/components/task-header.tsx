'use client'
import { Button } from '@veritio/ui'
import { Progress } from '@veritio/ui'
import { SkipForward } from 'lucide-react'
import { cn } from '@veritio/ui/utils'
import type { TaskHeaderProps } from '../types'

export function TaskHeader({
  taskNumber,
  totalTasks,
  instruction,
  progress,
  showProgress,
  allowSkip,
  onSkip,
  position = 'bottom-left',
  isOverlay = false,
}: TaskHeaderProps) {
  // Position classes for overlay mode
  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4',
  }

  // Standard header mode (not overlay)
  if (!isOverlay) {
    return (
      <div
        className="border-b px-6 py-4"
        style={{
          backgroundColor: 'var(--style-card-bg)',
          borderColor: 'var(--style-card-border)',
        }}
      >
        <div className="max-w-4xl mx-auto">
          {/* Task progress indicator */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {showProgress && (
                <>
                  <span className="text-sm font-medium" style={{ color: 'var(--style-text-primary)' }}>
                    Task {taskNumber}
                  </span>
                  <span className="text-sm" style={{ color: 'var(--style-text-secondary)' }}>of {totalTasks}</span>
                </>
              )}
            </div>
            {allowSkip && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onSkip}
                style={{ color: 'var(--style-text-secondary)' }}
              >
                <SkipForward className="h-4 w-4 mr-1" />
                Skip task
              </Button>
            )}
          </div>

          {/* Progress bar */}
          {showProgress && (
            <Progress value={progress} className="h-1 mb-4" />
          )}

          {/* Task instruction */}
          <p className="text-lg font-medium" style={{ color: 'var(--style-text-primary)' }}>
            {instruction || 'Complete this task'}
          </p>
        </div>
      </div>
    )
  }

  // Floating overlay mode - positioned card
  return (
    <div
      className={cn(
        'absolute z-20 max-w-sm',
        positionClasses[position]
      )}
    >
      <div
        className="rounded-xl shadow-lg px-4 py-3 backdrop-blur-sm"
        style={{
          backgroundColor: 'var(--brand)',
          color: 'var(--brand-foreground)',
        }}
      >
        {/* Task progress indicator */}
        {showProgress && (
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-medium" style={{ color: 'var(--brand-foreground)' }}>
              Task {taskNumber} of {totalTasks}
            </span>
          </div>
        )}

        {/* Task instruction */}
        <p className="text-sm font-medium leading-snug" style={{ color: 'var(--brand-foreground)' }}>
          {instruction || 'Complete this task'}
        </p>

        {/* Skip button */}
        {allowSkip && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onSkip}
            className="mt-2 h-7 px-2 text-xs hover:opacity-80"
            style={{ color: 'var(--brand-foreground)' }}
          >
            <SkipForward className="h-3 w-3 mr-1" />
            Skip
          </Button>
        )}
      </div>
    </div>
  )
}
