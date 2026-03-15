'use client'

import { Trash2 } from 'lucide-react'
import { ConfirmDialog } from './confirm-dialog'

export interface DeleteConfirmationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  /** Description/warning message */
  description: string
  onConfirm: () => void | Promise<void>
  isDeleting?: boolean
  loading?: boolean
  deleteLabel?: string
  cancelLabel?: string
}
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
  count: number
  itemType: string
}
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
