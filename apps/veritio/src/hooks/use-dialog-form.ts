'use client'

import { useState, useCallback, useRef } from 'react'

export interface UseDialogFormOptions<T = void> {
  /** Async function to call on form submission */
  onSubmit: () => Promise<T>
  /** Function to reset form fields (called after close animation) */
  onReset?: () => void
  /** Callback when submission succeeds (receives return value of onSubmit) */
  onSuccess?: (result: T) => void
  /** Delay in ms before resetting form after close (for animations) */
  resetDelay?: number
  /** Whether to close dialog on successful submission (default: true) */
  closeOnSuccess?: boolean
}

export interface UseDialogFormReturn {
  /** Whether the dialog is open */
  open: boolean
  /** Whether the form is currently submitting */
  isLoading: boolean
  /** Current error message, or null if no error */
  error: string | null
  /** Open the dialog */
  openDialog: () => void
  /** Close the dialog (triggers reset after delay) */
  closeDialog: () => void
  /** Handle open state change (for Dialog onOpenChange) */
  handleOpenChange: (open: boolean) => void
  /** Handle form submission (can be used as onSubmit handler) */
  handleSubmit: (e?: React.FormEvent) => Promise<void>
  /** Manually set an error */
  setError: (error: string | null) => void
  /** Clear the current error */
  clearError: () => void
}

export function useDialogForm<T = void>({
  onSubmit,
  onReset,
  onSuccess,
  resetDelay = 200,
  closeOnSuccess = true,
}: UseDialogFormOptions<T>): UseDialogFormReturn {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const resetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const openDialog = useCallback(() => {
    // Clear any pending reset timeout
    if (resetTimeoutRef.current) {
      clearTimeout(resetTimeoutRef.current)
      resetTimeoutRef.current = null
    }
    setOpen(true)
  }, [])

  const closeDialog = useCallback(() => {
    setOpen(false)
    // Reset form after animation delay
    resetTimeoutRef.current = setTimeout(() => {
      setError(null)
      onReset?.()
    }, resetDelay)
  }, [resetDelay, onReset])

  const handleOpenChange = useCallback((newOpen: boolean) => {
    if (newOpen) {
      openDialog()
    } else {
      closeDialog()
    }
  }, [openDialog, closeDialog])

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault()

    try {
      setIsLoading(true)
      setError(null)

      const result = await onSubmit()

      if (closeOnSuccess) {
        closeDialog()
      }

      onSuccess?.(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }, [onSubmit, onSuccess, closeOnSuccess, closeDialog])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    open,
    isLoading,
    error,
    openDialog,
    closeDialog,
    handleOpenChange,
    handleSubmit,
    setError,
    clearError,
  }
}
