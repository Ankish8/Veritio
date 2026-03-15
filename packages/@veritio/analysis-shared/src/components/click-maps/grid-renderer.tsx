'use client'

import { useRef, useEffect, useState, useMemo, memo, useCallback } from 'react'
import { cn } from '@veritio/ui'
import { GRID_GRADIENT_STOPS, GRID_GRADIENT_CSS, OVERLAY_COLORS } from '@veritio/core/colors'
import { calculateLetterboxOffset } from '../../lib/analytics'

interface ClickData {
  id?: string
  normalizedX: number
  normalizedY: number
  wasHotspot?: boolean
  wasCorrect?: boolean
}

interface GridRendererProps {
  clicks: ClickData[]
  imageUrl: string | null
  imageWidth: number
  imageHeight: number
  gridSize: number              // Number of rows/columns (e.g., 5 = 5x5 grid)
  showClickDots: boolean
  className?: string
}

interface GridCell {
  row: number
  col: number
  clickCount: number
}
export const GridRenderer = memo(function GridRenderer({
  clicks,
  imageUrl,
  imageWidth,
  imageHeight,
  gridSize,
  showClickDots,
  className,
}: GridRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [displayDimensions, setDisplayDimensions] = useState({ width: 0, height: 0 })
  const [imageLoaded, setImageLoaded] = useState(false)
  // Track actual image dimensions to handle letterboxing correctly
  const [imageNaturalDimensions, setImageNaturalDimensions] = useState({ width: 0, height: 0 })

  // Handle image load - capture actual image dimensions for letterbox correction
  const handleImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget
    setImageNaturalDimensions({ width: img.naturalWidth, height: img.naturalHeight })
    setImageLoaded(true)
  }, [])

  // Calculate display dimensions maintaining aspect ratio
  useEffect(() => {
    if (!containerRef.current || !imageWidth || !imageHeight) return

    const updateDimensions = () => {
      const container = containerRef.current
      if (!container) return

      const containerWidth = container.clientWidth
      const aspectRatio = imageWidth / imageHeight
      const displayWidth = containerWidth
      const displayHeight = Math.round(containerWidth / aspectRatio)

      setDisplayDimensions({ width: displayWidth, height: displayHeight })
    }

    updateDimensions()
    const resizeObserver = new ResizeObserver(updateDimensions)
    resizeObserver.observe(containerRef.current)

    return () => resizeObserver.disconnect()
  }, [imageWidth, imageHeight])

  // Aggregate clicks into grid cells
  const gridCells: GridCell[] = useMemo(() => {
    if (clicks.length === 0) return []

    const cells = new Map<string, GridCell>()

    clicks.forEach(click => {
      // Clamp coordinates to valid range
      const x = Math.min(99.99, Math.max(0, click.normalizedX))
      const y = Math.min(99.99, Math.max(0, click.normalizedY))

      const col = Math.floor((x / 100) * gridSize)
      const row = Math.floor((y / 100) * gridSize)
      const key = `${row},${col}`

      const existing = cells.get(key)
      if (existing) {
        existing.clickCount++
      } else {
        cells.set(key, { row, col, clickCount: 1 })
      }
    })

    return Array.from(cells.values())
  }, [clicks, gridSize])

  // Use total clicks as the color scale anchor so colors stay stable across grid sizes
  const totalClicks = clicks.length || 1
  const maxClicks = useMemo(() => {
    if (gridCells.length === 0) return 1
    return Math.max(...gridCells.map(c => c.clickCount), 1)
  }, [gridCells])

  // Render individual click dots with letterbox correction
  const renderClickDots = () => {
    if (!showClickDots || displayDimensions.width === 0) return null

    // Calculate letterbox offset to correct for aspect ratio mismatch
    const letterboxOffset = calculateLetterboxOffset(
      displayDimensions.width,
      displayDimensions.height,
      imageNaturalDimensions.width || imageWidth,
      imageNaturalDimensions.height || imageHeight
    )

    // Calculate the rendered image dimensions accounting for letterboxing
    const renderedImageWidth = displayDimensions.width - 2 * letterboxOffset.offsetX
    const renderedImageHeight = displayDimensions.height - 2 * letterboxOffset.offsetY

    return clicks.map((click, index) => {
      // Scale normalized coordinates to rendered image area, then add letterbox offset
      const x = (click.normalizedX / 100) * renderedImageWidth + letterboxOffset.offsetX
      const y = (click.normalizedY / 100) * renderedImageHeight + letterboxOffset.offsetY

      const isHit = click.wasHotspot ?? click.wasCorrect ?? false

      return (
        <div
          key={click.id || index}
          className={cn(
            'absolute w-3 h-3 -ml-1.5 -mt-1.5 rounded-full border-2 border-white shadow-sm',
            isHit ? 'bg-green-500' : 'bg-red-500'
          )}
          style={{ left: x, top: y }}
          title={isHit ? 'Correct click' : 'Incorrect click'}
        />
      )
    })
  }
  const getCellColor = (clickCount: number): string => {
    const t = Math.min(clickCount / totalClicks, 1) // fraction of all clicks

    const scaled = t * (GRID_GRADIENT_STOPS.length - 1)
    const i = Math.min(Math.floor(scaled), GRID_GRADIENT_STOPS.length - 2)
    const frac = scaled - i

    const { r: r0, g: g0, b: b0, a: a0 } = GRID_GRADIENT_STOPS[i]
    const { r: r1, g: g1, b: b1, a: a1 } = GRID_GRADIENT_STOPS[i + 1]

    const r = Math.round(r0 + (r1 - r0) * frac)
    const g = Math.round(g0 + (g1 - g0) * frac)
    const b = Math.round(b0 + (b1 - b0) * frac)
    const a = (a0 + (a1 - a0) * frac).toFixed(2)

    return `rgba(${r}, ${g}, ${b}, ${a})`
  }

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      {/* Image container with aspect ratio */}
      <div
        className="relative bg-stone-100 rounded-lg overflow-hidden"
        style={{
          width: displayDimensions.width || '100%',
          height: displayDimensions.height || 'auto',
          aspectRatio: displayDimensions.width ? undefined : `${imageWidth}/${imageHeight}`,
        }}
      >
        {/* Background image */}
        {imageUrl ? (
          <img
            src={imageUrl}
            alt="Click map image"
            className={cn(
              'w-full h-full object-contain transition-opacity duration-200',
              imageLoaded ? 'opacity-100' : 'opacity-0'
            )}
            onLoad={handleImageLoad}
            crossOrigin="anonymous"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            No image selected
          </div>
        )}

        {/* Grid overlay */}
        {displayDimensions.width > 0 && (
          <svg
            className="absolute inset-0 pointer-events-none"
            width="100%"
            height="100%"
            style={{ zIndex: 10 }}
          >
            {/* Grid lines */}
            {Array.from({ length: gridSize + 1 }).map((_, i) => (
              <g key={`lines-${i}`}>
                {/* Vertical line */}
                <line
                  x1={`${(i / gridSize) * 100}%`}
                  y1="0"
                  x2={`${(i / gridSize) * 100}%`}
                  y2="100%"
                  stroke={OVERLAY_COLORS.whiteMedium}
                  strokeWidth="0.5"
                />
                {/* Horizontal line */}
                <line
                  x1="0"
                  y1={`${(i / gridSize) * 100}%`}
                  x2="100%"
                  y2={`${(i / gridSize) * 100}%`}
                  stroke={OVERLAY_COLORS.whiteMedium}
                  strokeWidth="0.5"
                />
              </g>
            ))}

            {/* Cell backgrounds with click density */}
            {gridCells.map((cell) => {
              const cellWidth = 100 / gridSize
              const cellHeight = 100 / gridSize
              const fontSize = Math.max(10, Math.min(16, displayDimensions.width / gridSize / 3.5))

              return (
                <g key={`${cell.row},${cell.col}`}>
                  {/* Cell background */}
                  <rect
                    x={`${cell.col * cellWidth}%`}
                    y={`${cell.row * cellHeight}%`}
                    width={`${cellWidth}%`}
                    height={`${cellHeight}%`}
                    fill={getCellColor(cell.clickCount)}
                  />
                  {/* Click count label */}
                  <text
                    x={`${(cell.col + 0.5) * cellWidth}%`}
                    y={`${(cell.row + 0.5) * cellHeight}%`}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="white"
                    fontWeight="700"
                    fontFamily="system-ui, sans-serif"
                    style={{
                      textShadow: `0 1px 3px ${OVERLAY_COLORS.shadowText}`,
                      fontSize: `${fontSize}px`,
                    }}
                  >
                    {cell.clickCount}
                  </text>
                </g>
              )
            })}
          </svg>
        )}

        {/* Click dots overlay */}
        {showClickDots && (
          <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 15 }}>
            {renderClickDots()}
          </div>
        )}

        {/* Loading overlay */}
        {imageUrl && !imageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-stone-100">
            <div className="animate-pulse text-muted-foreground">Loading image...</div>
          </div>
        )}

        {/* No clicks message */}
        {clicks.length === 0 && imageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/5">
            <div className="bg-white/90 px-4 py-2 rounded-md text-sm text-muted-foreground">
              No clicks recorded for this task
            </div>
          </div>
        )}
      </div>

      {/* Color legend */}
      {gridCells.length > 0 && (
        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
          <span>0</span>
          <div
            className="flex-1 h-2.5 rounded-full max-w-48"
            style={{
              background: GRID_GRADIENT_CSS,
            }}
          />
          <span>{maxClicks} clicks</span>
        </div>
      )}
    </div>
  )
})
