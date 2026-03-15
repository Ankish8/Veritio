'use client'

import { Gift } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@veritio/ui/components/alert-dialog'

interface IncentiveConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  title?: string
}
export function IncentiveConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  title = 'Enable Incentive Display?',
}: IncentiveConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-green-600" />
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription>
            No incentive amount has been configured yet. You can configure the incentive
            in the Recruit tab after launching your study. The placeholder text will be
            shown until then.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            Enable
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
