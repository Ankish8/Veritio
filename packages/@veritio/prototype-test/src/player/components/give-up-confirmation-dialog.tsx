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

interface GiveUpConfirmationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}
export function GiveUpConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
}: GiveUpConfirmationDialogProps) {
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
            Can&apos;t complete this task?
          </AlertDialogTitle>
          <AlertDialogDescription style={{ color: 'var(--style-text-secondary)' }}>
            That&apos;s okay! Your attempt helps us understand where users get stuck.
            Click &quot;I&apos;m stuck&quot; to move on to the next task.
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
            Keep trying
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
            I&apos;m stuck
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
