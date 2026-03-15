'use client'

import { useState, useCallback } from 'react'

export interface UseDeletionDialogReturn<T = string> {
  /** Whether the dialog is currently open */
  isOpen: boolean

  /** The item pending deletion (null when dialog is closed) */
  itemToDelete: T | null

  /** Open the deletion dialog for a specific item */
  openDialog: (item: T) => void

  /** Close the dialog without deleting */
  closeDialog: () => void

  /** Confirm deletion - executes the handler and closes the dialog */
  confirmDeletion: (handler: (item: T) => void | Promise<void>) => Promise<void>
}

/**
 * Manages deletion dialog state for builder components.
 * Simpler than useConfirmDialog - designed specifically for delete flows.
 *
 * @example
 * const deletion = useDeletionDialog<string>()
 *
 * // Trigger deletion from a button
 * <Button onClick={() => deletion.openDialog(task.id)}>Delete</Button>
 *
 * // Render the dialog
 * <DeleteConfirmationDialog
 *   open={deletion.isOpen}
 *   onOpenChange={(open) => !open && deletion.closeDialog()}
 *   onConfirm={() => deletion.confirmDeletion(removeTask)}
 *   title="Delete task?"
 *   description="This will permanently delete this task."
 * />
 *
 * @example
 * // With async deletion and store action
 * const { removeTask } = useFirstClickActions()
 * const deletion = useDeletionDialog<string>()
 *
 * // In the dialog's onConfirm
 * onConfirm={() => deletion.confirmDeletion(removeTask)}
 */
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
