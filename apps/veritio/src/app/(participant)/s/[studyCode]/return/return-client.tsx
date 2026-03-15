'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { STATUS_COLORS } from '@/lib/colors'

export function ReturnClient() {
  const { studyCode } = useParams<{ studyCode: string }>()
  const [showUI, setShowUI] = useState(false)

  useEffect(() => {
    const channel = new BroadcastChannel('veritio-lwt-' + studyCode)
    channel.postMessage({ type: 'lwt-complete' })

    // Attempt to close the tab
    window.close()

    // If still open after 500ms, show fallback UI
    const timer = setTimeout(() => {
      setShowUI(true)
    }, 500)

    return () => {
      clearTimeout(timer)
      channel.close()
    }
  }, [studyCode])

  if (!showUI) return null

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-4">
      {/* Green checkmark circle */}
      <div className="flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M20 6L9 17L4 12"
            stroke={STATUS_COLORS.successDark}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <h1 className="text-xl font-semibold text-foreground">All tasks completed!</h1>
      <p className="text-sm text-muted-foreground text-center">
        You can close this tab and return to the study.
      </p>

      <button
        onClick={() => window.close()}
        className="mt-2 px-6 py-2.5 rounded-lg text-sm font-medium bg-neutral-900 text-white hover:bg-neutral-800 transition-colors"
      >
        Close tab
      </button>
    </div>
  )
}
