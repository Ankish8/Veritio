'use client'

import { useState, useCallback } from 'react'

export interface ConfirmDialogState<T = unknown> {
  isOpen: boolean
  data: T | null
  isLoading: boolean
}

export interface UseConfirmDialogReturn<T = unknown> {
  state: ConfirmDialogState<T>
  open: (data: T) => void
  close: () => void
  confirm: (handler: (data: T) => Promise<void> | void) => Promise<void>
  setLoading: (loading: boolean) => void
}

/** Manages confirmation dialog state with open/close, loading, and async confirmation. */
export function useConfirmDialog<T = unknown>(): UseConfirmDialogReturn<T> {
  const [state, setState] = useState<ConfirmDialogState<T>>({
    isOpen: false,
    data: null,
    isLoading: false,
  })

  const open = useCallback((data: T) => {
    setState({ isOpen: true, data, isLoading: false })
  }, [])

  const close = useCallback(() => {
    setState({ isOpen: false, data: null, isLoading: false })
  }, [])

  const setLoading = useCallback((loading: boolean) => {
    setState((prev) => ({ ...prev, isLoading: loading }))
  }, [])

  const confirm = useCallback(
    async (handler: (data: T) => Promise<void> | void) => {
      if (!state.data) return

      setState((prev) => ({ ...prev, isLoading: true }))
      try {
        await handler(state.data)
        close()
      } catch (error) {
        setState((prev) => ({ ...prev, isLoading: false }))
        throw error
      }
    },
    [state.data, close]
  )

  return { state, open, close, confirm, setLoading }
}

/** Simplified confirmation dialog without data payload. */
export function useConfirmAction() {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => {
    setIsOpen(false)
    setIsLoading(false)
  }, [])

  const confirm = useCallback(
    async (handler: () => Promise<void> | void) => {
      setIsLoading(true)
      try {
        await handler()
        close()
      } catch (error) {
        setIsLoading(false)
        throw error
      }
    },
    [close]
  )

  return { isOpen, isLoading, open, close, confirm }
}
