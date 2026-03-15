'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { FlaskConical } from 'lucide-react'
import { cn } from '@/lib/utils'
import { OVERLAY_COLORS } from '@/lib/colors'
import { usePreciseTimer } from '../hooks/use-precise-timer'
import type { FirstImpressionDesignWithQuestions, ExposureEvent, FocusEvent } from '../types'

interface ExposureScreenProps {
  design: FirstImpressionDesignWithQuestions
  durationMs: number
  countdownDurationMs: number
  exposureSequence: number
  showTimer: boolean
  showProgress: boolean
  designNumber: number
  totalDesigns: number
  displayMode: 'fit' | 'fill' | 'actual' | 'hidpi'
  backgroundColor: string
  onComplete: (exposure: ExposureEvent) => void
  isPractice?: boolean
}

export function ExposureScreen({
  design,
  durationMs,
  countdownDurationMs,
  exposureSequence,
  showTimer,
  showProgress,
  designNumber,
  totalDesigns,
  displayMode,
  backgroundColor,
  onComplete,
  isPractice = false,
}: ExposureScreenProps) {
  // eslint-disable-next-line react-hooks/purity
  const exposureStartRef = useRef<number>(Date.now())
  const focusEventsRef = useRef<FocusEvent[]>([])
  const imageRef = useRef<HTMLImageElement>(null)
  const [imageLoaded, setImageLoaded] = useState(false)

  // Track focus/blur events
  useEffect(() => {
    const handleFocus = () => {
      focusEventsRef.current.push({ type: 'focus', timestamp: Date.now() })
    }
    const handleBlur = () => {
      focusEventsRef.current.push({ type: 'blur', timestamp: Date.now() })
    }

    window.addEventListener('focus', handleFocus)
    window.addEventListener('blur', handleBlur)

    return () => {
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('blur', handleBlur)
    }
  }, [])

  // Determine if mobile image is being used (defined before timer to use in callback)
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
  const usingMobileImage = isMobile && !!design.mobile_image_url
  const imageUrl = isMobile && design.mobile_image_url
    ? design.mobile_image_url
    : design.image_url

  // Handle timer completion
  const handleTimerComplete = useCallback(() => {
    const now = Date.now()
    const exposure: ExposureEvent = {
      designId: design.id,
      exposureSequence,
      startedAt: exposureStartRef.current,
      endedAt: now,
      actualDurationMs: now - exposureStartRef.current,
      configuredDurationMs: durationMs,
      countdownDurationMs,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      imageRenderedWidth: imageRef.current?.clientWidth || 0,
      imageRenderedHeight: imageRef.current?.clientHeight || 0,
      usedMobileImage: usingMobileImage,
      focusEvents: focusEventsRef.current,
    }
    onComplete(exposure)
  }, [design.id, exposureSequence, durationMs, countdownDurationMs, usingMobileImage, onComplete])

  const { remainingMs, progress, start, isRunning } = usePreciseTimer({
    durationMs,
    onComplete: handleTimerComplete,
  })

  // Start timer when image is loaded
  useEffect(() => {
    if (imageLoaded && !isRunning) {
      exposureStartRef.current = Date.now()
      focusEventsRef.current = []
      start()
    }
  }, [imageLoaded, isRunning, start])

  const remainingSeconds = Math.ceil(remainingMs / 1000)

  // Check if we have a valid image to load
  const hasImage = !!imageUrl

  // If no image, consider it "loaded" immediately so timer can start
  useEffect(() => {
    if (!hasImage && !imageLoaded) {
      setImageLoaded(true)
    }
  }, [hasImage, imageLoaded])

  return (
    <div
      className="fixed inset-0 flex flex-col"
      style={{ backgroundColor: backgroundColor || 'var(--style-page-bg, #ffffff)' }}
    >
      {/* Progress indicator (top) - show Practice badge or Design X of Y */}
      {(showProgress && totalDesigns > 1) || isPractice ? (
        <div className="absolute top-4 left-4 z-10">
          <span
            className="text-sm font-medium px-3 py-1.5 rounded-full inline-flex items-center gap-1.5"
            style={{
              backgroundColor: isPractice ? 'var(--brand, #3b82f6)' : 'rgba(0,0,0,0.5)',
              color: '#fff',
            }}
          >
            {isPractice ? (
              <>
                <FlaskConical className="w-3.5 h-3.5" />
                Practice
              </>
            ) : (
              `Design ${designNumber} of ${totalDesigns}`
            )}
          </span>
        </div>
      ) : null}

      {/* Timer (top right) */}
      {showTimer && (
        <div className="absolute top-4 right-4 z-10">
          <div className="relative w-14 h-14">
            {/* Background circle */}
            <svg className="w-full h-full -rotate-90" viewBox="0 0 48 48">
              <circle
                cx="24"
                cy="24"
                r="20"
                fill={OVERLAY_COLORS.backdropMedium}
                stroke={OVERLAY_COLORS.whiteSoft}
                strokeWidth="3"
              />
              {/* Progress arc */}
              <circle
                cx="24"
                cy="24"
                r="20"
                fill="none"
                stroke={OVERLAY_COLORS.white}
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={`${(1 - progress) * 125.6} 125.6`}
                className="transition-all duration-100"
              />
            </svg>
            {/* Timer text */}
            <span
              className="absolute inset-0 flex items-center justify-center text-white font-bold text-lg"
            >
              {remainingSeconds}
            </span>
          </div>
        </div>
      )}

      {/* Design image container */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8 overflow-hidden">
        {/* Only render img when we have a URL */}
        {hasImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            ref={imageRef}
            src={imageUrl}
            alt={design.name || 'Design'}
            onLoad={() => setImageLoaded(true)}
            className={cn(
              'max-w-full max-h-full transition-opacity duration-300',
              displayMode === 'actual' && 'object-none',
              displayMode === 'fill' && 'object-cover w-full h-full',
              (displayMode === 'fit' || displayMode === 'hidpi') && 'object-contain',
              imageLoaded ? 'opacity-100' : 'opacity-0'
            )}
            style={{
              // For HiDPI mode, render at half size for sharp 2x displays
              ...(displayMode === 'hidpi' && design.width && design.height
                ? { maxWidth: design.width / 2, maxHeight: design.height / 2 }
                : {}),
            }}
          />
        )}

        {/* Loading skeleton - only show when we have an image that's loading */}
        {!imageLoaded && hasImage && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
          </div>
        )}

        {/* No image placeholder */}
        {!hasImage && (
          <div className="text-center p-8">
            <p
              className="text-lg"
              style={{ color: 'var(--style-text-secondary, #666)' }}
            >
              No design image uploaded
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
