'use client'

import { useRef, useEffect, useState, useCallback, memo, useMemo } from 'react'
// heatmap.js default export type - using any to avoid complex generic resolution
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Heatmap = any
import type { ClickDisplayMode, HeatmapSettings, SelectionSettings } from '../../types/analytics'
import { DEFAULT_HEATMAP_SETTINGS, DEFAULT_SELECTION_SETTINGS } from '../../types/analytics'
import { getPaletteGradient, calculateLetterboxOffset } from '../../lib/analytics'
import { cn, Tooltip, TooltipContent, TooltipTrigger } from '@veritio/ui'

interface ClickData {
  id?: string
  normalizedX: number
  normalizedY: number
  wasHotspot?: boolean
  wasCorrect?: boolean
  pageVisitNumber?: number
  timeSinceFrameLoadMs?: number
}

function formatResponseTime(ms: number | undefined): string {
  if (ms === undefined || ms === null) return '?'
  if (ms < 1000) return `${Math.round(ms)}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

interface HeatmapRendererProps {
  clicks: ClickData[]
  imageUrl: string | null
  imageWidth: number
  imageHeight: number
  displayMode: Exclude<ClickDisplayMode, 'grid'>
  /** @deprecated Use settings.grayscaleBackground instead */
  grayscaleMode?: boolean
  settings?: HeatmapSettings
  selectionSettings?: SelectionSettings
  className?: string
}

// Pin size configurations (width x height)
const PIN_SIZES = {
  small: { width: 16, height: 22 },
  medium: { width: 20, height: 28 },
  large: { width: 28, height: 38 },
}

// Dot size configurations (diameter)
const DOT_SIZES = {
  small: 10,
  medium: 14,
  large: 20,
}
export const HeatmapRenderer = memo(function HeatmapRenderer({
  clicks,
  imageUrl,
  imageWidth,
  imageHeight,
  displayMode,
  grayscaleMode = false,
  settings = DEFAULT_HEATMAP_SETTINGS,
  selectionSettings = DEFAULT_SELECTION_SETTINGS,
  className,
}: HeatmapRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const heatmapInstanceRef = useRef<Heatmap | null>(null)
  const [displayDimensions, setDisplayDimensions] = useState({ width: 0, height: 0 })
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)
  // Track actual image dimensions to handle letterboxing correctly
  const [imageNaturalDimensions, setImageNaturalDimensions] = useState({ width: 0, height: 0 })

  // Get current settings based on display mode
  const currentFilterSettings = displayMode === 'heatmap' ? settings : selectionSettings

  // Merge deprecated grayscaleMode prop with settings
  const effectiveGrayscale = currentFilterSettings.grayscaleBackground || grayscaleMode

  // Apply click filters from settings (works with both heatmap and selection settings)
  const filteredClicks = useMemo(() => {
    let result = clicks

    // Filter to first click only
    if (currentFilterSettings.showFirstClickOnly) {
      result = result.filter((click) => click.pageVisitNumber === 1)
    }

    // Filter to hits only (mutually exclusive with misses)
    if (currentFilterSettings.showHitsOnly) {
      result = result.filter((click) => click.wasHotspot === true || click.wasCorrect === true)
    }

    // Filter to misses only
    if (currentFilterSettings.showMissesOnly) {
      result = result.filter((click) => click.wasHotspot === false && click.wasCorrect !== true)
    }

    return result
  }, [clicks, currentFilterSettings.showFirstClickOnly, currentFilterSettings.showHitsOnly, currentFilterSettings.showMissesOnly])

  // Calculate display dimensions maintaining aspect ratio
  useEffect(() => {
    if (!containerRef.current || !imageWidth || !imageHeight) return

    const updateDimensions = () => {
      const container = containerRef.current
      if (!container) return

      const containerWidth = container.clientWidth
      const aspectRatio = imageWidth / imageHeight

      // Fit within container while maintaining aspect ratio
      const displayWidth = containerWidth
      const displayHeight = Math.round(containerWidth / aspectRatio)

      setDisplayDimensions({ width: displayWidth, height: displayHeight })
    }

    updateDimensions()
    const resizeObserver = new ResizeObserver(updateDimensions)
    resizeObserver.observe(containerRef.current)

    return () => resizeObserver.disconnect()
  }, [imageWidth, imageHeight])

  // Track previous settings to detect changes requiring heatmap recreation
  const prevSettingsRef = useRef({
    width: 0,
    height: 0,
    radius: settings.radius,
    opacity: settings.opacity,
    blur: settings.blur,
    palette: settings.palette,
  })

  // Initialize or update heatmap.js instance
  useEffect(() => {
    if (displayMode !== 'heatmap' || !containerRef.current || displayDimensions.width === 0) {
      // Clear existing heatmap when switching to selection mode
      if (heatmapInstanceRef.current) {
        heatmapInstanceRef.current.setData({ max: 1, data: [] })
      }
      return
    }

    const initHeatmap = async () => {
      try {
        // Dynamically import heatmap.js to avoid SSR issues
        const h337 = (await import('heatmap.js')).default

        // Find heatmap container
        const heatmapContainer = containerRef.current?.querySelector('.heatmap-container') as HTMLElement
        if (!heatmapContainer) return

        // Verify container has dimensions
        if (heatmapContainer.offsetWidth === 0 || heatmapContainer.offsetHeight === 0) return

        // Check if any setting changed that requires heatmap recreation
        const prev = prevSettingsRef.current
        const settingsChanged =
          Math.abs(prev.width - displayDimensions.width) > 10 ||
          Math.abs(prev.height - displayDimensions.height) > 10 ||
          prev.radius !== settings.radius ||
          prev.opacity !== settings.opacity ||
          prev.blur !== settings.blur ||
          prev.palette !== settings.palette

        // Recreate heatmap instance if settings changed or not yet created
        if (!heatmapInstanceRef.current || settingsChanged) {
          // Clear previous canvas if exists
          const existingCanvas = heatmapContainer.querySelector('canvas')
          if (existingCanvas) {
            existingCanvas.remove()
          }

          // Get gradient for selected palette
          const gradient = getPaletteGradient(settings.palette)

          heatmapInstanceRef.current = h337.create({
            container: heatmapContainer,
            radius: settings.radius,
            maxOpacity: settings.opacity,
            minOpacity: 0,
            blur: settings.blur,
            gradient,
          })

          prevSettingsRef.current = {
            width: displayDimensions.width,
            height: displayDimensions.height,
            radius: settings.radius,
            opacity: settings.opacity,
            blur: settings.blur,
            palette: settings.palette,
          }
        }

        // Normalize wasHotspot/wasCorrect to a single field for aggregation
        const normalizedClicks = filteredClicks.map(click => ({
          normalizedX: click.normalizedX,
          normalizedY: click.normalizedY,
          wasHotspot: click.wasHotspot ?? click.wasCorrect ?? false,
        }))

        // Calculate letterbox offset for heatmap positioning
        const letterboxOffset = calculateLetterboxOffset(
          displayDimensions.width,
          displayDimensions.height,
          imageNaturalDimensions.width || imageWidth,
          imageNaturalDimensions.height || imageHeight
        )
        const renderedImageWidth = displayDimensions.width - 2 * letterboxOffset.offsetX
        const renderedImageHeight = displayDimensions.height - 2 * letterboxOffset.offsetY

        // Pass individual click coordinates to heatmap.js — it handles density natively
        // via its Gaussian kernel. Pre-aggregating to a grid shifts heat centers and reduces accuracy.
        const finalPoints = normalizedClicks.map(click => {
          const x = (click.normalizedX / 100) * renderedImageWidth + letterboxOffset.offsetX
          const y = (click.normalizedY / 100) * renderedImageHeight + letterboxOffset.offsetY
          return { x: Math.round(x), y: Math.round(y), value: 1 }
        })

        const maxValue = Math.max(1, finalPoints.length > 0 ? Math.ceil(finalPoints.length / 10) : 1)

        heatmapInstanceRef.current.setData({
          max: maxValue,
          data: finalPoints,
        })
      } catch {
        // Heatmap initialization failed silently
      }
    }

    initHeatmap()
  }, [filteredClicks, displayMode, displayDimensions, settings, imageNaturalDimensions, imageWidth, imageHeight])

  // Handle image load - capture actual image dimensions for letterbox correction
  const handleImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget
    setImageNaturalDimensions({ width: img.naturalWidth, height: img.naturalHeight })
    setImageLoaded(true)
    setImageError(false)
  }, [])

  // Handle image error
  const handleImageError = useCallback(() => {
    setImageLoaded(true) // Hide loading state
    setImageError(true)
  }, [])

  // Render click dots for selection mode - supports multiple styles
  const renderClickDots = () => {
    if (displayMode !== 'selection' || displayDimensions.width === 0) return null

    const { pinStyle, pinSize, showAnimation, showLabels } = selectionSettings

    // Calculate letterbox offset to correct for aspect ratio mismatch
    // If the image's natural aspect ratio differs from the container's aspect ratio,
    // object-contain will center the image with padding, requiring coordinate adjustment
    const letterboxOffset = calculateLetterboxOffset(
      displayDimensions.width,
      displayDimensions.height,
      imageNaturalDimensions.width || imageWidth,
      imageNaturalDimensions.height || imageHeight
    )

    // Calculate the rendered image dimensions accounting for letterboxing
    const renderedImageWidth = displayDimensions.width - 2 * letterboxOffset.offsetX
    const renderedImageHeight = displayDimensions.height - 2 * letterboxOffset.offsetY

    // Choose the correct animation keyframe based on pin style:
    // - pin: anchored at bottom tip → dropIn ends at translate(-50%, -100%)
    // - dot/response-time: center-anchored → dropInCenter ends at translate(-50%, -50%)
    // Uses inline animation style instead of Tailwind class to avoid content scanning issues
    // with classes only used in shared packages.
    const animationKeyframe = pinStyle === 'pin' ? 'dropIn' : 'dropInCenter'

    return filteredClicks.map((click, index) => {
      // Scale normalized coordinates (0-100%) to rendered image area, then add letterbox offset
      // This positions clicks correctly relative to the actual image, not the container
      const x = (click.normalizedX / 100) * renderedImageWidth + letterboxOffset.offsetX
      const y = (click.normalizedY / 100) * renderedImageHeight + letterboxOffset.offsetY

      const isHit = click.wasHotspot ?? click.wasCorrect ?? false
      const hitColor = '#10b981'
      const missColor = '#ef4444'
      const hitColorDark = '#065f46'
      const missColorDark = '#991b1b'

      // Staggered animation delay based on index (max 500ms total spread)
      const animationDelay = showAnimation ? Math.min(index * 50, 500) : 0

      // Use inline animation style (not Tailwind arbitrary class) for reliable rendering
      const initialOpacity = showAnimation ? 0 : 1
      const animationStyle = showAnimation
        ? `${animationKeyframe} 0.4s ease-out ${animationDelay}ms forwards`
        : undefined

      // Render based on pin style
      if (pinStyle === 'dot') {
        const dotSize = DOT_SIZES[pinSize]
        const responseTime = formatResponseTime(click.timeSinceFrameLoadMs)
        const hasTimingData = click.timeSinceFrameLoadMs !== undefined && click.timeSinceFrameLoadMs !== null

        return (
          <Tooltip key={click.id || index}>
            <TooltipTrigger asChild>
              <div
                className="absolute hover:scale-110 cursor-pointer pointer-events-auto"
                style={{
                  left: x,
                  top: y,
                  transform: 'translate(-50%, -50%)',
                  opacity: initialOpacity,
                  animation: animationStyle,
                }}
              >
                <div
                  className="rounded-full border-2 border-white shadow-lg"
                  style={{
                    width: dotSize,
                    height: dotSize,
                    backgroundColor: isHit ? hitColor : missColor,
                  }}
                />
                {showLabels && (
                  <span
                    className="absolute left-1/2 -translate-x-1/2 text-[12px] font-medium whitespace-nowrap px-1 py-0.5 rounded bg-black/70 text-white"
                    style={{ top: dotSize + 4 }}
                  >
                    {isHit ? 'Hit' : 'Miss'}
                  </span>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[220px]">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: isHit ? hitColor : missColor }}
                  />
                  <span className="font-semibold text-sm">{isHit ? 'Hit' : 'Miss'}</span>
                </div>
                {hasTimingData && (
                  <div className="text-[13px] text-white">
                    <strong>{responseTime}</strong> to click
                  </div>
                )}
                <div className="text-[11px] text-white/80">
                  {isHit
                    ? 'Clicked on an interactive element'
                    : 'Clicked on a non-interactive area'}
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        )
      }

      if (pinStyle === 'response-time') {
        const responseTime = formatResponseTime(click.timeSinceFrameLoadMs)
        const minWidth = pinSize === 'small' ? 24 : pinSize === 'medium' ? 28 : 36
        const height = DOT_SIZES[pinSize] + 4
        const fontSize = pinSize === 'small' ? 8 : pinSize === 'medium' ? 9 : 11

        // Generate speed category based on response time
        const getSpeedCategory = (ms: number | undefined) => {
          if (ms === undefined || ms === null) return { label: 'Unknown', description: 'No timing data available' }
          if (ms < 1000) return { label: 'Fast', description: 'User found target quickly' }
          if (ms < 3000) return { label: 'Moderate', description: 'User took a moment to locate target' }
          if (ms < 5000) return { label: 'Slow', description: 'User needed time to find target' }
          return { label: 'Very slow', description: 'User may have struggled to find target' }
        }

        const speedCategory = getSpeedCategory(click.timeSinceFrameLoadMs)

        return (
          <Tooltip key={click.id || index}>
            <TooltipTrigger asChild>
              <div
                className="absolute hover:scale-110 cursor-pointer pointer-events-auto"
                style={{
                  left: x,
                  top: y,
                  transform: 'translate(-50%, -50%)',
                  opacity: initialOpacity,
                  animation: animationStyle,
                }}
              >
                <div
                  className="rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white font-bold px-1"
                  style={{
                    minWidth,
                    height,
                    backgroundColor: isHit ? hitColor : missColor,
                    fontSize,
                  }}
                >
                  {responseTime}
                </div>
                {showLabels && (
                  <span
                    className="absolute left-1/2 -translate-x-1/2 text-[12px] font-medium whitespace-nowrap px-1 py-0.5 rounded bg-black/70 text-white"
                    style={{ top: height + 4 }}
                  >
                    {isHit ? 'Hit' : 'Miss'}
                  </span>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[240px]">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: isHit ? hitColor : missColor }}
                  />
                  <span className="font-semibold text-sm">{isHit ? 'Hit' : 'Miss'}</span>
                </div>
                <div className="text-[13px] text-white">
                  <strong>{responseTime}</strong> to click after this screen loaded
                </div>
                <div className="text-xs text-white/90 border-t border-white/30 pt-1.5">
                  <span className="font-semibold">{speedCategory.label}:</span> {speedCategory.description}
                </div>
                <div className="text-[11px] text-white/80">
                  {isHit
                    ? 'Clicked on an interactive element'
                    : 'Clicked on a non-interactive area'}
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        )
      }

      // Default: pin style (teardrop marker)
      const { width: pinWidth, height: pinHeight } = PIN_SIZES[pinSize]
      const responseTime = formatResponseTime(click.timeSinceFrameLoadMs)
      const hasTimingData = click.timeSinceFrameLoadMs !== undefined && click.timeSinceFrameLoadMs !== null

      return (
        <Tooltip key={click.id || index}>
          <TooltipTrigger asChild>
            <div
              className="absolute hover:scale-110 cursor-pointer pointer-events-auto"
              style={{
                left: x,
                top: y,
                transform: 'translate(-50%, -100%)',
                opacity: initialOpacity,
                animation: animationStyle,
              }}
            >
              {/* Pin marker - SVG teardrop shape */}
              <svg
                width={pinWidth}
                height={pinHeight}
                viewBox="0 0 20 28"
                fill="none"
                className="drop-shadow-lg"
              >
                {/* Outer stroke for contrast */}
                <path
                  d="M10 0C4.5 0 0 4.5 0 10c0 7 10 18 10 18s10-11 10-18c0-5.5-4.5-10-10-10z"
                  fill={isHit ? hitColorDark : missColorDark}
                />
                {/* Inner fill */}
                <path
                  d="M10 2C5.6 2 2 5.6 2 10c0 5.8 8 14.5 8 14.5s8-8.7 8-14.5c0-4.4-3.6-8-8-8z"
                  fill={isHit ? hitColor : missColor}
                />
                {/* White center dot */}
                <circle cx="10" cy="10" r="4" fill="white" />
              </svg>
              {showLabels && (
                <span
                  className="absolute left-1/2 -translate-x-1/2 text-[12px] font-medium whitespace-nowrap px-1 py-0.5 rounded bg-black/70 text-white"
                  style={{ top: pinHeight + 4 }}
                >
                  {isHit ? 'Hit' : 'Miss'}
                </span>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[220px]">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: isHit ? hitColor : missColor }}
                />
                <span className="font-semibold text-sm">{isHit ? 'Hit' : 'Miss'}</span>
              </div>
              {hasTimingData && (
                <div className="text-[13px] text-white">
                  <strong>{responseTime}</strong> to click
                </div>
              )}
              <div className="text-[11px] text-white/80">
                {isHit
                  ? 'Clicked on an interactive element'
                  : 'Clicked on a non-interactive area'}
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      )
    })
  }

  return (
    <div ref={containerRef} className={cn('relative w-full min-w-0', className)}>
      {/* Frame container with aspect ratio - use max-width to allow shrinking */}
      <div
        className="relative bg-stone-100 rounded-lg overflow-hidden w-full"
        style={{
          maxWidth: displayDimensions.width || undefined,
          aspectRatio: `${imageWidth}/${imageHeight}`,
        }}
      >
        {/* Background image with optional grayscale */}
        {imageUrl && !imageError ? (
          <img
            src={imageUrl}
            alt="Click map image"
            className={cn(
              'w-full h-full object-contain transition-opacity duration-200',
              imageLoaded ? 'opacity-100' : 'opacity-0',
              effectiveGrayscale && 'grayscale'
            )}
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        ) : imageError ? (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <p>Failed to load image</p>
              <p className="text-xs mt-1">The image may have expired or be unavailable.</p>
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            No image selected
          </div>
        )}

        {/* Heatmap wrapper - absolute positioning preserved (heatmap.js overrides inner container to relative) */}
        <div
          className="pointer-events-none"
          style={{
            display: displayMode === 'heatmap' ? 'block' : 'none',
            position: 'absolute',
            top: 0,
            left: 0,
            width: displayDimensions.width > 0 ? displayDimensions.width : '100%',
            height: displayDimensions.height > 0 ? displayDimensions.height : '100%',
            zIndex: 10,
          }}
        >
          {/* Inner container for heatmap.js - it will set position:relative on this */}
          <div
            className="heatmap-container"
            style={{
              width: '100%',
              height: '100%',
            }}
          />
        </div>

        {/* Selection mode overlay - customizable opacity to make pins stand out */}
        {displayMode === 'selection' && (
          <>
            {selectionSettings.overlayOpacity > 0 && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  zIndex: 5,
                  backgroundColor: `rgba(0, 0, 0, ${selectionSettings.overlayOpacity})`,
                }}
              />
            )}
            <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 15 }}>
              {renderClickDots()}
            </div>
          </>
        )}

        {/* Loading overlay */}
        {imageUrl && !imageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-stone-100">
            <div className="animate-pulse text-muted-foreground">Loading image...</div>
          </div>
        )}

        {/* No clicks message */}
        {filteredClicks.length === 0 && imageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/5">
            <div className="bg-white/90 px-4 py-2 rounded-md text-sm text-muted-foreground">
              {clicks.length === 0
                ? 'No clicks recorded for this task'
                : 'No clicks match current filters'}
            </div>
          </div>
        )}
      </div>
    </div>
  )
})
