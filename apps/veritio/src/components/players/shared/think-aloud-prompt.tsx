'use client'

import { useState, useEffect, useRef } from 'react'
import { X, MessageCircle } from 'lucide-react'
import type { ThinkAloudPromptPosition } from '@/components/builders/shared/types'

export interface ThinkAloudPromptProps {
  visible: boolean
  prompt: string
  onDismiss: () => void
  position?: ThinkAloudPromptPosition
  autoDismissSeconds?: number
}

function getPositionStyles(position: ThinkAloudPromptPosition): React.CSSProperties {
  switch (position) {
    case 'top-left':
      return { top: '72px', left: '16px' }
    case 'top-right':
      return { top: '72px', right: '16px' }
    case 'bottom-left':
      return { bottom: '72px', left: '16px' }
    case 'bottom-right':
      return { bottom: '72px', right: '16px' }
    default:
      return { top: '72px', right: '16px' }
  }
}

export function ThinkAloudPrompt({
  visible,
  prompt,
  onDismiss,
  position = 'top-right',
  autoDismissSeconds = 0,
}: ThinkAloudPromptProps) {
  const [isHovering, setIsHovering] = useState(false)
  const autoDismissTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Auto-dismiss logic
  useEffect(() => {
    if (!visible || autoDismissSeconds <= 0 || isHovering) {
      if (autoDismissTimeoutRef.current) {
        clearTimeout(autoDismissTimeoutRef.current)
        autoDismissTimeoutRef.current = null
      }
      return
    }

    autoDismissTimeoutRef.current = setTimeout(() => {
      onDismiss()
    }, autoDismissSeconds * 1000)

    return () => {
      if (autoDismissTimeoutRef.current) {
        clearTimeout(autoDismissTimeoutRef.current)
        autoDismissTimeoutRef.current = null
      }
    }
  }, [visible, autoDismissSeconds, isHovering, onDismiss])

  const isTop = position.startsWith('top')
  const positionStyles = getPositionStyles(position)

  return (
    <div
      className="fixed z-40"
      style={{
        ...positionStyles,
        opacity: visible ? 1 : 0,
        transform: visible
          ? 'scale(1) translateY(0)'
          : `scale(0.95) translateY(${isTop ? '-10px' : '10px'})`,
        transition: 'opacity 0.2s ease-out, transform 0.2s ease-out',
        pointerEvents: visible ? 'auto' : 'none',
      }}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      role="alert"
      aria-live="polite"
    >
      <div
        className="flex items-start gap-3 p-4 max-w-xs shadow-lg"
        style={{
          backgroundColor: 'var(--style-card-bg)',
          border: '1px solid var(--brand)',
          borderRadius: 'var(--style-radius-lg)',
        }}
      >
        {/* Icon */}
        <div
          className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
          style={{ backgroundColor: 'var(--brand-subtle)' }}
        >
          <MessageCircle className="w-4 h-4" style={{ color: 'var(--brand)' }} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 pr-6">
          <p
            className="text-sm font-medium mb-0.5"
            style={{ color: 'var(--style-text-primary)' }}
          >
            Think aloud
          </p>
          <p
            className="text-sm"
            style={{ color: 'var(--style-text-secondary)' }}
          >
            {prompt}
          </p>
        </div>

        {/* Dismiss button */}
        <button
          onClick={onDismiss}
          className="absolute top-2 right-2 p-1.5 rounded-full transition-colors hover:opacity-80"
          style={{ color: 'var(--style-text-muted)' }}
          aria-label="Dismiss prompt"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
