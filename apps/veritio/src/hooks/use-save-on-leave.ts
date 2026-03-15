'use client'

import { useEffect, useRef } from 'react'

interface UseSaveOnLeaveOptions {
  /** Whether there are unsaved changes */
  isDirty: boolean
  /** Save function to call on leave */
  onSave: () => Promise<void>
  /** Whether save-on-leave is enabled */
  enabled?: boolean
  /** Whether a save is currently in progress */
  isSaving?: boolean
}

export function useSaveOnLeave({
  isDirty,
  onSave,
  enabled = true,
  isSaving = false,
}: UseSaveOnLeaveOptions): void {
  const isDirtyRef = useRef(isDirty)
  const isSavingRef = useRef(isSaving)
  const onSaveRef = useRef(onSave)

  // Keep refs updated
  useEffect(() => { isDirtyRef.current = isDirty }, [isDirty])
  useEffect(() => { isSavingRef.current = isSaving }, [isSaving])
  useEffect(() => { onSaveRef.current = onSave }, [onSave])

  // beforeunload handler - shows warning and attempts save
  useEffect(() => {
    if (!enabled) return

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirtyRef.current) {
        // Show browser's native "unsaved changes" dialog
        e.preventDefault()
        e.returnValue = ''

        // Attempt save (fire-and-forget, browser may not wait)
        if (!isSavingRef.current) {
          onSaveRef.current().catch(() => {})
        }

        return ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [enabled])

  // Unmount handler - save on SPA navigation
  useEffect(() => {
    return () => {
      if (isDirtyRef.current && !isSavingRef.current) {
        // Fire-and-forget save on unmount
        onSaveRef.current().catch(() => {})
      }
    }
  }, [])
}
