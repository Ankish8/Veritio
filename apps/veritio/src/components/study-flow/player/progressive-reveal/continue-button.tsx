'use client'

import { FadeIn } from '../css-animations'
import { Button } from '@/components/ui/button'
import { ArrowDown, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ContinueButtonProps {
  onClick: () => void
  disabled?: boolean
  isLastQuestion?: boolean
  className?: string
}

export function ContinueButton({
  onClick,
  disabled = false,
  isLastQuestion = false,
  className,
}: ContinueButtonProps) {
  return (
    <FadeIn
      delay={0.1}
      duration={0.2}
      className={cn('mt-4', className)}
    >
      <Button
        onClick={onClick}
        disabled={disabled}
        size="sm"
        className="gap-2"
      >
        {isLastQuestion ? (
          <>
            Complete <Check className="h-4 w-4" />
          </>
        ) : (
          <>
            Continue <ArrowDown className="h-4 w-4" />
          </>
        )}
      </Button>
    </FadeIn>
  )
}
