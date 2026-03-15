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
} from '@veritio/ui'
import type { SkipConfirmationDialogProps } from '../types'
export function SkipConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
}: SkipConfirmationDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        size="sm"
        style={{
          backgroundColor: 'var(--style-card-bg)',
          borderRadius: 'var(--style-radius-lg)',
          border: '1px solid var(--style-card-border)',
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle style={{ color: 'var(--style-text-primary)' }}>
            Skip this task?
          </AlertDialogTitle>
          <AlertDialogDescription style={{ color: 'var(--style-text-secondary)' }}>
            Are you sure you want to skip this task? You won&apos;t be able to
            return to it later.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter
          style={{
            backgroundColor: 'var(--style-card-bg)',
            borderColor: 'var(--style-card-border)',
          }}
        >
          <AlertDialogCancel
            showKeyboardHint={false}
            style={{
              borderRadius: 'var(--style-button-radius)',
              backgroundColor: 'var(--style-card-bg)',
              borderColor: 'var(--style-card-border)',
              color: 'var(--style-text-primary)',
            }}
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            showKeyboardHint={false}
            style={{
              borderRadius: 'var(--style-button-radius)',
              backgroundColor: 'var(--brand)',
              color: 'var(--brand-foreground)',
            }}
          >
            Skip task
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
