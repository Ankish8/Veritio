'use client'

import { Trash2 } from 'lucide-react'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

export interface DeleteConfirmationDialogProps {
  /** Whether the dialog is open */
  open: boolean
  /** Called when open state changes */
  onOpenChange: (open: boolean) => void
  /** Title of the dialog */
  title: string
  /** Description/warning message */
  description: string
  /** Called when delete is confirmed */
  onConfirm: () => void | Promise<void>
  /** Whether deletion is in progress (alias for 'loading') */
  isDeleting?: boolean
  /** Whether deletion is in progress */
  loading?: boolean
  /** Text for the delete button (default: "Delete") */
  deleteLabel?: string
  /** Text for the cancel button (default: "Cancel") */
  cancelLabel?: string
}

/**
 * Reusable delete confirmation dialog.
 *
 * Now uses ConfirmDialog internally for consistent behavior:
 * - Keyboard shortcuts (Cmd/Ctrl+Enter to confirm, Escape to cancel)
 * - Loading state with spinner
 * - Consistent styling with danger variant
 *
 * @example
 * const deleteDialog = useConfirmDialog<Study>()
 *
 * <DeleteConfirmationDialog
 *   open={deleteDialog.state.isOpen}
 *   onOpenChange={(open) => !open && deleteDialog.close()}
 *   title="Delete Study"
 *   description="This will permanently delete the study and all its data."
 *   onConfirm={() => deleteDialog.confirm(async (study) => {
 *     await deleteStudy(study.id)
 *   })}
 *   isDeleting={deleteDialog.state.isLoading}
 * />
 */
export function DeleteConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  isDeleting,
  loading,
  deleteLabel = 'Delete',
  cancelLabel = 'Cancel',
}: DeleteConfirmationDialogProps) {
  // Support both 'isDeleting' and 'loading' props for backwards compatibility
  const isLoading = isDeleting ?? loading ?? false

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      confirmText={deleteLabel}
      cancelText={cancelLabel}
      variant="danger"
      icon={<Trash2 className="h-5 w-5" />}
      onConfirm={onConfirm}
      loading={isLoading}
    />
  )
}

export interface BulkDeleteConfirmationDialogProps
  extends Omit<DeleteConfirmationDialogProps, 'title' | 'description'> {
  /** Number of items to delete */
  count: number
  /** Type of items (e.g., "studies", "participants") */
  itemType: string
}

/**
 * Specialized dialog for bulk delete operations.
 * Automatically generates title and description based on count.
 */
export function BulkDeleteConfirmationDialog({
  count,
  itemType,
  ...props
}: BulkDeleteConfirmationDialogProps) {
  const title = `Delete ${count} ${itemType}`
  const description = `This will permanently delete ${count} ${itemType}. This action cannot be undone.`

  return (
    <DeleteConfirmationDialog
      {...props}
      title={title}
      description={description}
    />
  )
}
