'use client'

import { AlertTriangle } from 'lucide-react'

/**
 * Warning banner shown when incentive display is enabled
 * but no incentive amount has been configured.
 * Used by both WelcomeSection and ThankYouSection.
 */
export function IncentiveWarning() {
  return (
    <div className="flex items-start gap-2 rounded-md bg-amber-50 border border-amber-200 px-3 py-2">
      <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
      <div className="text-xs text-amber-800">
        <p className="font-medium">No incentive configured</p>
        <p className="text-amber-700">
          Configure an incentive in the Recruit tab after launching your study.
        </p>
      </div>
    </div>
  )
}
