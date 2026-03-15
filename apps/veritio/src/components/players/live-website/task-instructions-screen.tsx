'use client'

import { KeyRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { LiveWebsiteTask } from './types'

interface TaskInstructionsScreenProps {
  task: LiveWebsiteTask
  taskIndex: number
  totalTasks: number
  showProgress: boolean
  onOpenWebsite: () => void
  onSkip?: () => void
  allowSkip: boolean
  /** Login instructions shown on first task only */
  authInstructions?: string | null
}

export function TaskInstructionsScreen({
  task,
  taskIndex,
  totalTasks,
  showProgress,
  onOpenWebsite,
  onSkip,
  allowSkip,
  authInstructions,
}: TaskInstructionsScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 max-w-2xl mx-auto">
      {showProgress && (
        <p className="text-sm mb-6" style={{ color: 'var(--style-text-secondary)' }}>
          Task {taskIndex + 1} of {totalTasks}
        </p>
      )}

      <h2 className="text-2xl font-semibold mb-4 text-center" style={{ color: 'var(--style-text-primary)' }}>
        {task.title || `Task ${taskIndex + 1}`}
      </h2>

      {task.instructions && (
        <div
          className="mb-6 text-center [&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6"
          style={{ color: 'var(--style-text-secondary)' }}
          dangerouslySetInnerHTML={{ __html: task.instructions }}
        />
      )}

      {/* Login instructions — shown on first task only */}
      {authInstructions && taskIndex === 0 && (
        <div
          className="mb-6 w-full max-w-md flex items-start gap-3 p-4 text-sm"
          style={{
            borderRadius: 'var(--style-radius)',
            backgroundColor: 'color-mix(in srgb, var(--brand) 8%, transparent)',
            border: '1px solid color-mix(in srgb, var(--brand) 20%, transparent)',
          }}
        >
          <KeyRound className="h-4 w-4 shrink-0 mt-0.5" style={{ color: 'var(--brand)' }} />
          <div style={{ color: 'var(--style-text-primary)' }} className="whitespace-pre-wrap">
            {authInstructions}
          </div>
        </div>
      )}

      <p className="text-sm mb-8" style={{ color: 'var(--style-text-secondary)' }}>
        A floating task panel will appear to guide you.
      </p>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        <Button
          size="lg"
          className="w-full"
          onClick={onOpenWebsite}
          style={{ backgroundColor: 'var(--brand)', color: 'white' }}
        >
          Start task
        </Button>

        {allowSkip && onSkip && (
          <Button variant="ghost" size="lg" className="w-full" onClick={onSkip}>
            Skip task
          </Button>
        )}
      </div>
    </div>
  )
}
