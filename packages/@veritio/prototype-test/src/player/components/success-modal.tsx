'use client'

import { CheckCircle2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@veritio/ui'
import { BrandedButton } from '../../components/study-flow/step-layout'
import type { SuccessModalProps } from '../types'
export function SuccessModal({ open, onContinue }: SuccessModalProps) {
  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="max-w-sm text-center"
        showCloseButton={false}
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        style={{
          backgroundColor: 'var(--style-card-bg)',
          borderRadius: 'var(--style-radius-lg)',
          border: '1px solid var(--style-card-border)',
        }}
      >
        <DialogHeader className="items-center">
          {/* Success icon - uses brand color for background */}
          <div
            className="mx-auto mb-2 flex h-14 w-14 items-center justify-center"
            style={{
              borderRadius: 'var(--style-radius-xl)',
              backgroundColor: 'var(--brand-light, #dcfce7)',
            }}
          >
            <CheckCircle2
              className="h-8 w-8"
              style={{ color: 'var(--brand, #16a34a)' }}
            />
          </div>

          <DialogTitle
            className="text-lg font-semibold"
            style={{ color: 'var(--style-text-primary)' }}
          >
            Well done!
          </DialogTitle>

          <DialogDescription style={{ color: 'var(--style-text-secondary)' }}>
            You&apos;ve successfully completed the task
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="justify-center sm:justify-center">
          <BrandedButton onClick={onContinue} className="min-w-[120px]" size="default">
            Continue
          </BrandedButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
