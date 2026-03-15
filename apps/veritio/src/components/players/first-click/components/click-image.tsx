'use client'

import { useRef, useCallback, useState, useEffect } from 'react'
import type { FirstClickImageScaleMode } from '@veritio/study-types'
import type { ClickData } from '../types'
import { cn } from '@/lib/utils'

interface ClickImageProps {
  imageUrl: string
  imageWidth?: number
  imageHeight?: number
  scalingMode: FirstClickImageScaleMode
  onImageClick: (click: ClickData) => void
  disabled?: boolean
}

export function ClickImage({
  imageUrl,
  scalingMode,
  onImageClick,
  disabled = false,
}: ClickImageProps) {
  const imageRef = useRef<HTMLImageElement>(null)
  const [clickPosition, setClickPosition] = useState<{ x: number; y: number } | null>(null)

  const handleClick = useCallback((e: React.MouseEvent<HTMLImageElement>) => {
    if (disabled || !imageRef.current) return

    const rect = imageRef.current.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const clickY = e.clientY - rect.top

    // Normalize to 0-1 based on displayed image size
    const normalizedX = clickX / rect.width
    const normalizedY = clickY / rect.height

    // Store click position for ripple animation
    setClickPosition({ x: clickX, y: clickY })

    // Gather viewport and image data
    const clickData: ClickData = {
      x: normalizedX,
      y: normalizedY,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      imageRenderedWidth: Math.round(rect.width),
      imageRenderedHeight: Math.round(rect.height),
    }

    onImageClick(clickData)
  }, [disabled, onImageClick])

  // Clear click position after animation
  useEffect(() => {
    if (clickPosition) {
      const timer = setTimeout(() => setClickPosition(null), 600)
      return () => clearTimeout(timer)
    }
  }, [clickPosition])

  // Get container and image classes based on scaling mode
  const getContainerClass = () => {
    switch (scalingMode) {
      case 'never_scale':
        // Show at natural size (scrollable container in parent)
        return 'relative inline-block'
      case 'fit':
      case 'scale_on_small':
      default:
        // Absolute positioning ensures container fills parent completely
        return 'absolute inset-0 flex items-center justify-center'
    }
  }

  const getImageClass = () => {
    const base = cn(
      'select-none',
      disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
    )

    switch (scalingMode) {
      case 'never_scale':
        // No constraints - show at natural size
        return base
      case 'fit':
      case 'scale_on_small':
      default:
        // Constrain image to fit within the absolutely positioned container
        return cn(base, 'max-w-full max-h-full object-contain')
    }
  }

  const getImageStyle = (): React.CSSProperties => {
    switch (scalingMode) {
      case 'never_scale':
        // Override Tailwind's preflight max-width: 100% to show image at natural size
        return {
          maxWidth: 'none',
          maxHeight: 'none',
        }
      default:
        return {}
    }
  }

  return (
    <div className={getContainerClass()}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imageRef}
        src={imageUrl}
        alt="Task image"
        className={getImageClass()}
        onClick={handleClick}
        draggable={false}
        style={getImageStyle()}
      />

      {/* Click Ripple Animation */}
      {clickPosition && (
        <div
          className="absolute w-12 h-12 rounded-full border-4 animate-ping pointer-events-none"
          style={{
            left: clickPosition.x - 24,
            top: clickPosition.y - 24,
            borderColor: 'var(--brand, #6366f1)',
          }}
        />
      )}
    </div>
  )
}
