'use client'

import { useAutoSave } from './use-auto-save'

interface UseBuilderAutoSaveOptions {
  onSave: () => Promise<void>
  isDirty: boolean
  /** Changes for every edit while dirty remains true. */
  changeToken?: unknown
  delay?: number
  enabled?: boolean
  onSaveError?: (error: Error) => void
}

interface UseBuilderAutoSaveReturn {
  saveNow: () => Promise<void>
  cancelPendingSave: () => void
  isSaving: boolean
  lastError: Error | null
}

/**
 * Backward-compatible builder wrapper around the shared latest-wins autosave.
 * New builder surfaces use useBuilderShellSave so metadata and content share one
 * complete persistence pipeline.
 */
export function useBuilderAutoSave({
  onSave,
  isDirty,
  changeToken,
  delay = 500,
  enabled = true,
  onSaveError,
}: UseBuilderAutoSaveOptions): UseBuilderAutoSaveReturn {
  const { saveNow, cancel, isSaving, lastError } = useAutoSave({
    onSave,
    isDirty,
    changeToken,
    delay,
    enabled,
    onError: onSaveError,
  })

  return {
    saveNow,
    cancelPendingSave: cancel,
    isSaving,
    lastError,
  }
}
