'use client'

import { useTranslations } from 'next-intl'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface ValidationErrorDialogProps {
  error: string | null
  onClose: () => void
}

export function ValidationErrorDialog({ error, onClose }: ValidationErrorDialogProps) {
  const t = useTranslations()
  return (
    <AlertDialog open={!!error} onOpenChange={() => onClose()}>
      <AlertDialogContent
        style={{
          backgroundColor: 'var(--style-card-bg)',
          borderColor: 'var(--style-card-border)',
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle style={{ color: 'var(--style-text-primary)' }}>
            {t('cardSort.cannotSubmitYet')}
          </AlertDialogTitle>
          <AlertDialogDescription className="whitespace-pre-line" style={{ color: 'var(--style-text-secondary)' }}>
            {error}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={onClose} style={{ backgroundColor: 'var(--brand)', color: 'var(--brand-foreground)' }}>
            {t('common.ok')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
