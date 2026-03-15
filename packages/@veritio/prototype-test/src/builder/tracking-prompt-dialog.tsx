'use client'

import { Info } from 'lucide-react'
import { Button } from '@veritio/ui'
import type { PathMode } from './hooks/use-pathway-builder-state'

interface TrackingPromptDialogProps {
  pathMode: PathMode
  onDismiss: () => void
  onEnable: () => void
}

export function TrackingPromptDialog({
  pathMode,
  onDismiss,
  onEnable,
}: TrackingPromptDialogProps) {
  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50"
        style={{ zIndex: 9999 }}
        onClick={onDismiss}
      />
      {/* Dialog content */}
      <div
        className="fixed w-full max-w-md rounded-lg border bg-white dark:bg-gray-900 p-6 shadow-lg"
        style={{
          zIndex: 10000,
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)'
        }}
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100">
              <Info className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">
                {pathMode === 'flexible' ? 'Require specific states?' : 'Track interactions?'}
              </h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {pathMode === 'flexible'
                  ? 'You interacted with a component or opened an overlay (like a tab, toggle, or modal). Would you like to require this state for task success?'
                  : 'You interacted with a component or opened an overlay (like a tab, toggle, or modal). Would you like to track these interactions as part of your path?'}
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onDismiss}>
              No thanks
            </Button>
            <Button onClick={onEnable}>
              Enable
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
