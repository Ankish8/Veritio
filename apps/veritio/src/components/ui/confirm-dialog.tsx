'use client'

import * as React from 'react'
import { AlertTriangle, Trash2, Rocket, Pause, Loader2, Flag } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useKeyboardShortcut } from '@/hooks/use-keyboard-shortcut'

type ConfirmVariant = 'danger' | 'warning' | 'info'

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  variant?: ConfirmVariant
  icon?: React.ReactNode
  onConfirm: () => void | Promise<void>
  loading?: boolean
  /** Whether to show keyboard shortcut hints on buttons (default: true) */
  showKeyboardHints?: boolean
}

const variantStyles: Record<ConfirmVariant, { bg: string; text: string }> = {
  danger: { bg: 'bg-red-100', text: 'text-red-600' },
  warning: { bg: 'bg-amber-100', text: 'text-amber-600' },
  info: { bg: 'bg-blue-100', text: 'text-blue-600' },
}

const defaultIcons: Record<ConfirmVariant, React.ReactNode> = {
  danger: <Trash2 className="h-5 w-5" />,
  warning: <AlertTriangle className="h-5 w-5" />,
  info: <Rocket className="h-5 w-5" />,
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'warning',
  icon,
  onConfirm,
  loading = false,
  showKeyboardHints = true,
}: ConfirmDialogProps) {
  const [isLoading, setIsLoading] = React.useState(false)
  const actualLoading = loading || isLoading

  const handleConfirm = React.useCallback(async () => {
    if (actualLoading) return
    setIsLoading(true)
    try {
      await onConfirm()
      onOpenChange(false)
    } finally {
      setIsLoading(false)
    }
  }, [actualLoading, onConfirm, onOpenChange])

  // Keyboard shortcut: Cmd/Ctrl + Enter to confirm
  useKeyboardShortcut({
    enabled: open && !actualLoading,
    onCmdEnter: handleConfirm,
  })

  const styles = variantStyles[variant]
  const displayIcon = icon ?? defaultIcons[variant]

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className={`${styles.bg} ${styles.text}`}>
            {displayIcon}
          </AlertDialogMedia>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            disabled={actualLoading}
            showKeyboardHint={showKeyboardHints}
          >
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            variant={variant === 'danger' ? 'destructive' : 'default'}
            disabled={actualLoading}
            showKeyboardHint={showKeyboardHints && !actualLoading}
          >
            {actualLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Please wait...
              </>
            ) : (
              confirmText
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// Re-export DeleteConfirmDialog from type-to-delete-dialog for backward compatibility
// This now uses the type-to-confirm pattern for all delete operations
export { DeleteConfirmDialog } from '@/components/ui/type-to-delete-dialog'

export function LaunchStudyDialog({
  open,
  onOpenChange,
  onConfirm,
  loading,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void | Promise<void>
  loading?: boolean
}) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Launch Study?"
      description="Once launched, participants will be able to access your study via the share link. You can pause it at any time."
      confirmText="Launch Study"
      variant="info"
      icon={<Rocket className="h-5 w-5" />}
      onConfirm={onConfirm}
      loading={loading}
    />
  )
}

export function PauseStudyDialog({
  open,
  onOpenChange,
  onConfirm,
  loading,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void | Promise<void>
  loading?: boolean
}) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Pause Study?"
      description="Pausing the study will prevent new participants from accessing it. Existing sessions will not be affected."
      confirmText="Pause Study"
      variant="warning"
      icon={<Pause className="h-5 w-5" />}
      onConfirm={onConfirm}
      loading={loading}
    />
  )
}

export function EndStudyDialog({
  open,
  onOpenChange,
  onConfirm,
  loading,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void | Promise<void>
  loading?: boolean
}) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="End Study?"
      description="Ending the study will permanently close it. No new participants will be able to access it, and you won't be able to reopen it."
      confirmText="End Study"
      variant="danger"
      icon={<Flag className="h-5 w-5" />}
      onConfirm={onConfirm}
      loading={loading}
    />
  )
}
