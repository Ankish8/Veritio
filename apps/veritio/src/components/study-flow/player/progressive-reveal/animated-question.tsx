'use client'

import { useRef, useEffect } from 'react'
import { FadeIn } from '../css-animations'
import { cn } from '@/lib/utils'

interface AnimatedQuestionProps {
  questionId: string
  isRevealed: boolean
  isActive: boolean
  index: number
  children: React.ReactNode
  className?: string
  onRef?: (el: HTMLDivElement | null) => void
}

export function AnimatedQuestion({
  questionId,
  isRevealed,
  isActive,
  index,
  children,
  className,
  onRef,
}: AnimatedQuestionProps) {
  const internalRef = useRef<HTMLDivElement>(null)

  // Call onRef callback when ref changes
  useEffect(() => {
    if (onRef) {
      onRef(internalRef.current)
    }
  }, [onRef, isRevealed])

  if (!isRevealed) {
    return null
  }

  return (
    <FadeIn
      ref={internalRef}
      duration={0.3}
      distance={20}
      role="group"
      aria-labelledby={`question-${questionId}-label`}
      aria-current={isActive ? 'step' : undefined}
      className={cn(
        'transition-opacity',
        isActive ? 'opacity-100' : 'opacity-70',
        className
      )}
      style={{ transitionDelay: `${index * 50}ms` }}
    >
      {children}
    </FadeIn>
  )
}
