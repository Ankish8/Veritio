'use client'

import { useEffect, useState, useCallback } from 'react'
import { cn } from '@/lib/utils'

interface CountdownOverlayProps {
  durationSeconds: number
  onComplete: () => void
  message?: string
  isPractice?: boolean
}

export function CountdownOverlay({
  durationSeconds,
  onComplete,
  message,
  isPractice = false,
}: CountdownOverlayProps) {
  // Default message based on practice mode
  const displayMessage = message ?? (isPractice ? 'Practice Round' : 'Get ready...')
  const [count, setCount] = useState(durationSeconds)
  const [isAnimating, setIsAnimating] = useState(false)

  // Handle countdown tick
  const tick = useCallback(() => {
    setIsAnimating(true)
    // Small delay to trigger CSS animation
    setTimeout(() => setIsAnimating(false), 100)

    setCount((prev) => {
      if (prev <= 1) {
        // Schedule completion
        setTimeout(onComplete, 500) // Brief pause after "1"
        return 0
      }
      return prev - 1
    })
  }, [onComplete])

  useEffect(() => {
    if (durationSeconds === 0) {
      // No countdown, complete immediately
      onComplete()
      return
    }

    // Start countdown
    const interval = setInterval(tick, 1000)

    return () => clearInterval(interval)
  }, [durationSeconds, tick, onComplete])

  // Don't render if no countdown
  if (durationSeconds === 0) {
    return null
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ backgroundColor: 'var(--style-page-bg, #ffffff)' }}
    >
      {/* Message */}
      <p
        className={cn(
          'text-lg font-medium mb-8 animate-pulse',
          isPractice && 'text-xl'
        )}
        style={{ color: isPractice ? 'var(--brand, #3b82f6)' : 'var(--style-text-secondary, #666)' }}
      >
        {displayMessage}
      </p>

      {/* Countdown number */}
      <div
        className={cn(
          'text-[120px] sm:text-[180px] font-bold transition-transform duration-200',
          isAnimating && 'scale-110'
        )}
        style={{ color: 'var(--style-text-primary, #000)' }}
      >
        {count > 0 ? count : ''}
      </div>

      {/* Progress dots */}
      <div className="flex gap-3 mt-8">
        {Array.from({ length: durationSeconds }, (_, i) => (
          <div
            key={i}
            className={cn(
              'w-3 h-3 rounded-full transition-all duration-300',
              i < durationSeconds - count
                ? 'scale-100'
                : 'scale-75 opacity-30'
            )}
            style={{
              backgroundColor:
                i < durationSeconds - count
                  ? 'var(--brand, #3b82f6)'
                  : 'var(--style-text-secondary, #999)',
            }}
          />
        ))}
      </div>
    </div>
  )
}
