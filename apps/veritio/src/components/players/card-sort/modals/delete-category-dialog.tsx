'use client'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface DeleteCategoryDialogProps {
  categoryId: string | null
  onClose: () => void
  onConfirm: () => void
}

export function DeleteCategoryDialog({ categoryId, onClose, onConfirm }: DeleteCategoryDialogProps) {
  return (
    <AlertDialog open={!!categoryId} onOpenChange={() => onClose()}>
      <AlertDialogContent
        style={{
          backgroundColor: 'var(--style-card-bg)',
          borderColor: 'var(--style-card-border)',
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle style={{ color: 'var(--style-text-primary)' }}>Delete Group?</AlertDialogTitle>
          <AlertDialogDescription style={{ color: 'var(--style-text-secondary)' }}>
            This will delete the group and move all cards back to unsorted. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            style={{
              backgroundColor: 'var(--warning-color, #ef4444)',
              color: 'white',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '0.9'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '1'
            }}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
