'use client'

import { useState, useCallback } from 'react'

export interface UseDeletionDialogReturn<T = string> {
  isOpen: boolean
  itemToDelete: T | null
  openDialog: (item: T) => void
  closeDialog: () => void
  confirmDeletion: (handler: (item: T) => void | Promise<void>) => Promise<void>
}
export function useDeletionDialog<T = string>(): UseDeletionDialogReturn<T> {
  const [isOpen, setIsOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<T | null>(null)

  const openDialog = useCallback((item: T) => {
    setItemToDelete(item)
    setIsOpen(true)
  }, [])

  const closeDialog = useCallback(() => {
    setIsOpen(false)
    setItemToDelete(null)
  }, [])

  const confirmDeletion = useCallback(
    async (handler: (item: T) => void | Promise<void>) => {
      if (itemToDelete === null) return

      try {
        await handler(itemToDelete)
        closeDialog() // Only close on success
      } catch (error) {
        // Keep dialog open on error so user can retry
        // The caller's error handling (toast, etc.) will show the error
        throw error
      }
    },
    [itemToDelete, closeDialog]
  )

  return {
    isOpen,
    itemToDelete,
    openDialog,
    closeDialog,
    confirmDeletion,
  }
}
