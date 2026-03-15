'use client'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

interface InstructionsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  instructions?: {
    title?: string
    part1?: string
    part2?: string
  }
  fallbackInstructions?: string
  finishedButtonText: string
}

export function InstructionsModal({
  open,
  onOpenChange,
  instructions,
  fallbackInstructions,
  finishedButtonText,
}: InstructionsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{instructions?.title || 'Instructions'}</DialogTitle>
        </DialogHeader>
        <DialogDescription asChild>
          <div className="space-y-4 text-sm" style={{ color: 'var(--style-text-secondary)' }}>
            {instructions?.part1 && (
              <div
                className="max-w-none [&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6"
                style={{
                  color: 'var(--style-text-secondary)',
                }}
                dangerouslySetInnerHTML={{ __html: instructions.part1 }}
              />
            )}
            {instructions?.part2 && (
              <div
                className="max-w-none [&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6"
                style={{
                  color: 'var(--style-text-secondary)',
                }}
                dangerouslySetInnerHTML={{ __html: instructions.part2 }}
              />
            )}
            {!instructions?.part1 && !instructions?.part2 && (
              <p>
                {fallbackInstructions || `You will be presented with a set of items to organize. Take your time and group them in a way that makes sense to you. When you're done, click "${finishedButtonText}" at the top right.`}
              </p>
            )}
          </div>
        </DialogDescription>
        <div className="flex justify-end mt-4">
          <Button onClick={() => onOpenChange(false)}>OK</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
