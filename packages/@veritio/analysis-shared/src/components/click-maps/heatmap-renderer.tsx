'use client'

import { useRef, useEffect, useState, useCallback, memo, useMemo } from 'react'
import type { ClickDisplayMode, HeatmapSettings, SelectionSettings } from '../../types/analytics'
import { DEFAULT_HEATMAP_SETTINGS, DEFAULT_SELECTION_SETTINGS } from '../../types/analytics'
import { getPaletteGradient, calculateLetterboxOffset } from '../../lib/analytics'
import { cn, Tooltip, TooltipContent, TooltipTrigger } from '@veritio/ui'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

import type { Heatmap as HeatmapInstance } from 'heatmap.js'

interface ClickData {
  id?: string
  normalizedX: number
  normalizedY: number
  wasHotspot?: boolean
  wasCorrect?: boolean
  pageVisitNumber?: number
  timeSinceFrameLoadMs?: number
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

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const HIT_COLOR = '#10b981'
const MISS_COLOR = '#ef4444'
const HIT_COLOR_DARK = '#065f46'
const MISS_COLOR_DARK = '#991b1b'

const Z_INDEX = {
  selectionOverlay: 5,
  heatmapLayer: 10,
  clickDots: 15,
} as const

const PIN_SIZES = {
  small: { width: 16, height: 22 },
  medium: { width: 20, height: 28 },
  large: { width: 28, height: 38 },
}

const DOT_SIZES = {
  small: 10,
  medium: 14,
  large: 20,
}

// ---------------------------------------------------------------------------
// Utility functions
// ---------------------------------------------------------------------------

function formatResponseTime(ms: number | undefined): string {
  if (ms === undefined || ms === null) return '?'
  if (ms < 1000) return `${Math.round(ms)}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

function getSpeedCategory(ms: number | undefined): { label: string; description: string } {
  if (ms === undefined || ms === null) return { label: 'Unknown', description: 'No timing data available' }
  if (ms < 1000) return { label: 'Fast', description: 'User found target quickly' }
  if (ms < 3000) return { label: 'Moderate', description: 'User took a moment to locate target' }
  if (ms < 5000) return { label: 'Slow', description: 'User needed time to find target' }
  return { label: 'Very slow', description: 'User may have struggled to find target' }
}

// ---------------------------------------------------------------------------
// useDisplayDimensions hook - ResizeObserver logic
// ---------------------------------------------------------------------------

function useDisplayDimensions(
  containerRef: React.RefObject<HTMLDivElement | null>,
  imageWidth: number,
  imageHeight: number,
): { width: number; height: number } {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })

  useEffect(() => {
    if (!containerRef.current || !imageWidth || !imageHeight) return

    function updateDimensions() {
      const container = containerRef.current
      if (!container) return

      const containerWidth = container.clientWidth
      const aspectRatio = imageWidth / imageHeight

      const displayWidth = containerWidth
      const displayHeight = Math.round(containerWidth / aspectRatio)

      setDimensions({ width: displayWidth, height: displayHeight })
    }

    updateDimensions()
    const resizeObserver = new ResizeObserver(updateDimensions)
    resizeObserver.observe(containerRef.current)

    return () => resizeObserver.disconnect()
  }, [imageWidth, imageHeight, containerRef])

  return dimensions
}

// ---------------------------------------------------------------------------
// useLetterboxOffset hook - calculated from display + image dimensions
// ---------------------------------------------------------------------------

function useLetterboxOffset(
  displayWidth: number,
  displayHeight: number,
  naturalWidth: number,
  naturalHeight: number,
  imageWidth: number,
  imageHeight: number,
): { offsetX: number; offsetY: number; renderedWidth: number; renderedHeight: number } {
  return useMemo(() => {
    const offset = calculateLetterboxOffset(
      displayWidth,
      displayHeight,
      naturalWidth || imageWidth,
      naturalHeight || imageHeight,
    )
    return {
      offsetX: offset.offsetX,
      offsetY: offset.offsetY,
      renderedWidth: displayWidth - 2 * offset.offsetX,
      renderedHeight: displayHeight - 2 * offset.offsetY,
    }
  }, [displayWidth, displayHeight, naturalWidth, naturalHeight, imageWidth, imageHeight])
}

// ---------------------------------------------------------------------------
// useHeatmapInstance hook - manages heatmap.js lifecycle
// ---------------------------------------------------------------------------

function useHeatmapInstance(
  containerRef: React.RefObject<HTMLDivElement | null>,
  displayMode: string,
  displayDimensions: { width: number; height: number },
  settings: HeatmapSettings,
  filteredClicks: ClickData[],
  letterbox: { offsetX: number; offsetY: number; renderedWidth: number; renderedHeight: number },
): void {
  const heatmapInstanceRef = useRef<HeatmapInstance | null>(null)

  const prevSettingsRef = useRef({
    width: 0,
    height: 0,
    radius: settings.radius,
    opacity: settings.opacity,
    blur: settings.blur,
    palette: settings.palette,
  })

  useEffect(() => {
    if (displayMode !== 'heatmap' || !containerRef.current || displayDimensions.width === 0) {
      if (heatmapInstanceRef.current) {
        heatmapInstanceRef.current.setData({ max: 1, data: [] })
      }
      return
    }

    let aborted = false

    async function initHeatmap() {
      try {
        const h337 = (await import('heatmap.js')).default

        if (aborted) return

        const heatmapContainer = containerRef.current?.querySelector('.heatmap-container') as HTMLElement
        if (!heatmapContainer) return
        if (heatmapContainer.offsetWidth === 0 || heatmapContainer.offsetHeight === 0) return

        const prev = prevSettingsRef.current
        const settingsChanged =
          Math.abs(prev.width - displayDimensions.width) > 10 ||
          Math.abs(prev.height - displayDimensions.height) > 10 ||
          prev.radius !== settings.radius ||
          prev.opacity !== settings.opacity ||
          prev.blur !== settings.blur ||
          prev.palette !== settings.palette

        if (!heatmapInstanceRef.current || settingsChanged) {
          const existingCanvas = heatmapContainer.querySelector('canvas')
          if (existingCanvas) {
            existingCanvas.remove()
          }

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

        if (aborted) return

        const finalPoints = filteredClicks.map(click => {
          const x = (click.normalizedX / 100) * letterbox.renderedWidth + letterbox.offsetX
          const y = (click.normalizedY / 100) * letterbox.renderedHeight + letterbox.offsetY
          return { x: Math.round(x), y: Math.round(y), value: 1 }
        })

        const maxValue = Math.max(1, finalPoints.length > 0 ? Math.ceil(finalPoints.length / 10) : 1)

        heatmapInstanceRef.current?.setData({
          max: maxValue,
          data: finalPoints,
        })
      } catch {
        // Heatmap initialization failed silently
      }
    }

    initHeatmap()

    return () => {
      aborted = true
    }
  }, [filteredClicks, displayMode, displayDimensions, settings, letterbox, containerRef])
}

// ---------------------------------------------------------------------------
// Shared sub-components
// ---------------------------------------------------------------------------

interface ClickMarkerWrapperProps {
  x: number
  y: number
  transform: string
  initialOpacity: number
  animationStyle: string | undefined
  children: React.ReactNode
}

function ClickMarkerWrapper({ x, y, transform, initialOpacity, animationStyle, children }: ClickMarkerWrapperProps) {
  return (
    <div
      className="absolute hover:scale-110 cursor-pointer pointer-events-auto"
      style={{
        left: x,
        top: y,
        transform,
        opacity: initialOpacity,
        animation: animationStyle,
      }}
    >
      {children}
    </div>
  )
}

interface HitMissHeaderProps {
  isHit: boolean
}

function HitMissHeader({ isHit }: HitMissHeaderProps) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="inline-block w-2.5 h-2.5 rounded-full"
        style={{ backgroundColor: isHit ? HIT_COLOR : MISS_COLOR }}
      />
      <span className="font-semibold text-sm">{isHit ? 'Hit' : 'Miss'}</span>
    </div>
  )
}

interface ClickLabelProps {
  isHit: boolean
  top: number
}

function ClickLabel({ isHit, top }: ClickLabelProps) {
  return (
    <span
      className="absolute left-1/2 -translate-x-1/2 text-[12px] font-medium whitespace-nowrap px-1 py-0.5 rounded bg-black/70 text-white"
      style={{ top: top + 4 }}
    >
      {isHit ? 'Hit' : 'Miss'}
    </span>
  )
}

function HitMissDescription({ isHit }: { isHit: boolean }) {
  return (
    <div className="text-[11px] text-white/80">
      {isHit
        ? 'Clicked on an interactive element'
        : 'Clicked on a non-interactive area'}
    </div>
  )
}

// ---------------------------------------------------------------------------
// ClickDotsOverlay - selection mode dots/pins
// ---------------------------------------------------------------------------

interface ClickDotsOverlayProps {
  filteredClicks: ClickData[]
  selectionSettings: SelectionSettings
  letterbox: { offsetX: number; offsetY: number; renderedWidth: number; renderedHeight: number }
}

const ClickDotsOverlay = memo(function ClickDotsOverlay({
  filteredClicks,
  selectionSettings,
  letterbox,
}: ClickDotsOverlayProps) {
  const { pinStyle, pinSize, showAnimation, showLabels } = selectionSettings

  // Choose the correct animation keyframe based on pin style
  const animationKeyframe = pinStyle === 'pin' ? 'dropIn' : 'dropInCenter'

  return (
    <>
      {filteredClicks.map((click, index) => {
        const x = (click.normalizedX / 100) * letterbox.renderedWidth + letterbox.offsetX
        const y = (click.normalizedY / 100) * letterbox.renderedHeight + letterbox.offsetY

        const isHit = click.wasHotspot ?? click.wasCorrect ?? false

        const animationDelay = showAnimation ? Math.min(index * 50, 500) : 0
        const initialOpacity = showAnimation ? 0 : 1
        const animationStyle = showAnimation
          ? `${animationKeyframe} 0.4s ease-out ${animationDelay}ms forwards`
          : undefined

        const transform = pinStyle === 'pin' ? 'translate(-50%, -100%)' : 'translate(-50%, -50%)'

        if (pinStyle === 'dot') {
          return (
            <DotMarker
              key={click.id || index}
              click={click}
              x={x}
              y={y}
              isHit={isHit}
              dotSize={DOT_SIZES[pinSize]}
              showLabels={showLabels}
              initialOpacity={initialOpacity}
              animationStyle={animationStyle}
              transform={transform}
            />
          )
        }

        if (pinStyle === 'response-time') {
          return (
            <ResponseTimeMarker
              key={click.id || index}
              click={click}
              x={x}
              y={y}
              isHit={isHit}
              pinSize={pinSize}
              showLabels={showLabels}
              initialOpacity={initialOpacity}
              animationStyle={animationStyle}
              transform={transform}
            />
          )
        }

        // Default: pin style (teardrop marker)
        return (
          <PinMarker
            key={click.id || index}
            click={click}
            x={x}
            y={y}
            isHit={isHit}
            pinSize={pinSize}
            showLabels={showLabels}
            initialOpacity={initialOpacity}
            animationStyle={animationStyle}
          />
        )
      })}
    </>
  )
})

// ---------------------------------------------------------------------------
// Individual marker components
// ---------------------------------------------------------------------------

interface MarkerBaseProps {
  click: ClickData
  x: number
  y: number
  isHit: boolean
  showLabels: boolean
  initialOpacity: number
  animationStyle: string | undefined
}

function DotMarker({
  click, x, y, isHit, dotSize, showLabels, initialOpacity, animationStyle, transform,
}: MarkerBaseProps & { dotSize: number; transform: string }) {
  const responseTime = formatResponseTime(click.timeSinceFrameLoadMs)
  const hasTimingData = click.timeSinceFrameLoadMs !== undefined && click.timeSinceFrameLoadMs !== null

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <ClickMarkerWrapper x={x} y={y} transform={transform} initialOpacity={initialOpacity} animationStyle={animationStyle}>
          <div
            className="rounded-full border-2 border-white shadow-lg"
            style={{
              width: dotSize,
              height: dotSize,
              backgroundColor: isHit ? HIT_COLOR : MISS_COLOR,
            }}
          />
          {showLabels && <ClickLabel isHit={isHit} top={dotSize} />}
        </ClickMarkerWrapper>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[220px]">
        <div className="space-y-1.5">
          <HitMissHeader isHit={isHit} />
          {hasTimingData && (
            <div className="text-[13px] text-white">
              <strong>{responseTime}</strong> to click
            </div>
          )}
          <HitMissDescription isHit={isHit} />
        </div>
      </TooltipContent>
    </Tooltip>
  )
}

function ResponseTimeMarker({
  click, x, y, isHit, pinSize, showLabels, initialOpacity, animationStyle, transform,
}: MarkerBaseProps & { pinSize: 'small' | 'medium' | 'large'; transform: string }) {
  const responseTime = formatResponseTime(click.timeSinceFrameLoadMs)
  const minWidth = pinSize === 'small' ? 24 : pinSize === 'medium' ? 28 : 36
  const height = DOT_SIZES[pinSize] + 4
  const fontSize = pinSize === 'small' ? 8 : pinSize === 'medium' ? 9 : 11
  const speedCategory = getSpeedCategory(click.timeSinceFrameLoadMs)

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <ClickMarkerWrapper x={x} y={y} transform={transform} initialOpacity={initialOpacity} animationStyle={animationStyle}>
          <div
            className="rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white font-bold px-1"
            style={{
              minWidth,
              height,
              backgroundColor: isHit ? HIT_COLOR : MISS_COLOR,
              fontSize,
            }}
          >
            {responseTime}
          </div>
          {showLabels && <ClickLabel isHit={isHit} top={height} />}
        </ClickMarkerWrapper>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[240px]">
        <div className="space-y-2">
          <HitMissHeader isHit={isHit} />
          <div className="text-[13px] text-white">
            <strong>{responseTime}</strong> to click after this screen loaded
          </div>
          <div className="text-xs text-white/90 border-t border-white/30 pt-1.5">
            <span className="font-semibold">{speedCategory.label}:</span> {speedCategory.description}
          </div>
          <HitMissDescription isHit={isHit} />
        </div>
      </TooltipContent>
    </Tooltip>
  )
}

function PinMarker({
  click, x, y, isHit, pinSize, showLabels, initialOpacity, animationStyle,
}: MarkerBaseProps & { pinSize: 'small' | 'medium' | 'large' }) {
  const { width: pinWidth, height: pinHeight } = PIN_SIZES[pinSize]
  const responseTime = formatResponseTime(click.timeSinceFrameLoadMs)
  const hasTimingData = click.timeSinceFrameLoadMs !== undefined && click.timeSinceFrameLoadMs !== null

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <ClickMarkerWrapper x={x} y={y} transform="translate(-50%, -100%)" initialOpacity={initialOpacity} animationStyle={animationStyle}>
          <svg
            width={pinWidth}
            height={pinHeight}
            viewBox="0 0 20 28"
            fill="none"
            className="drop-shadow-lg"
          >
            <path
              d="M10 0C4.5 0 0 4.5 0 10c0 7 10 18 10 18s10-11 10-18c0-5.5-4.5-10-10-10z"
              fill={isHit ? HIT_COLOR_DARK : MISS_COLOR_DARK}
            />
            <path
              d="M10 2C5.6 2 2 5.6 2 10c0 5.8 8 14.5 8 14.5s8-8.7 8-14.5c0-4.4-3.6-8-8-8z"
              fill={isHit ? HIT_COLOR : MISS_COLOR}
            />
            <circle cx="10" cy="10" r="4" fill="white" />
          </svg>
          {showLabels && <ClickLabel isHit={isHit} top={pinHeight} />}
        </ClickMarkerWrapper>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[220px]">
        <div className="space-y-1.5">
          <HitMissHeader isHit={isHit} />
          {hasTimingData && (
            <div className="text-[13px] text-white">
              <strong>{responseTime}</strong> to click
            </div>
          )}
          <HitMissDescription isHit={isHit} />
        </div>
      </TooltipContent>
    </Tooltip>
  )
}

// ---------------------------------------------------------------------------
// Main HeatmapRenderer component
// ---------------------------------------------------------------------------

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
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [imageNaturalDimensions, setImageNaturalDimensions] = useState({ width: 0, height: 0 })

  const displayDimensions = useDisplayDimensions(containerRef, imageWidth, imageHeight)

  const currentFilterSettings = displayMode === 'heatmap' ? settings : selectionSettings
  const effectiveGrayscale = currentFilterSettings.grayscaleBackground || grayscaleMode

  const filteredClicks = useMemo(() => {
    let result = clicks

    if (currentFilterSettings.showFirstClickOnly) {
      result = result.filter((click) => click.pageVisitNumber === 1)
    }

    if (currentFilterSettings.showHitsOnly) {
      result = result.filter((click) => click.wasHotspot === true || click.wasCorrect === true)
    }

    if (currentFilterSettings.showMissesOnly) {
      result = result.filter((click) => click.wasHotspot === false && click.wasCorrect !== true)
    }

    return result
  }, [clicks, currentFilterSettings.showFirstClickOnly, currentFilterSettings.showHitsOnly, currentFilterSettings.showMissesOnly])

  const letterbox = useLetterboxOffset(
    displayDimensions.width,
    displayDimensions.height,
    imageNaturalDimensions.width,
    imageNaturalDimensions.height,
    imageWidth,
    imageHeight,
  )

  useHeatmapInstance(
    containerRef,
    displayMode,
    displayDimensions,
    settings,
    filteredClicks,
    letterbox,
  )

  const handleImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget
    setImageNaturalDimensions({ width: img.naturalWidth, height: img.naturalHeight })
    setImageLoaded(true)
    setImageError(false)
  }, [])

  const handleImageError = useCallback(() => {
    setImageLoaded(true)
    setImageError(true)
  }, [])

  return (
    <div ref={containerRef} className={cn('relative w-full min-w-0', className)}>
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

        {/* Heatmap wrapper */}
        <div
          className="pointer-events-none"
          style={{
            display: displayMode === 'heatmap' ? 'block' : 'none',
            position: 'absolute',
            top: 0,
            left: 0,
            width: displayDimensions.width > 0 ? displayDimensions.width : '100%',
            height: displayDimensions.height > 0 ? displayDimensions.height : '100%',
            zIndex: Z_INDEX.heatmapLayer,
          }}
        >
          <div
            className="heatmap-container"
            style={{ width: '100%', height: '100%' }}
          />
        </div>

        {/* Selection mode overlay */}
        {displayMode === 'selection' && (
          <>
            {selectionSettings.overlayOpacity > 0 && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  zIndex: Z_INDEX.selectionOverlay,
                  backgroundColor: `rgba(0, 0, 0, ${selectionSettings.overlayOpacity})`,
                }}
              />
            )}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ zIndex: Z_INDEX.clickDots }}
            >
              {displayDimensions.width > 0 && (
                <ClickDotsOverlay
                  filteredClicks={filteredClicks}
                  selectionSettings={selectionSettings}
                  letterbox={letterbox}
                />
              )}
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
