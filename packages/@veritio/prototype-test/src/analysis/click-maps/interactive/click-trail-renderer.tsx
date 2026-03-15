'use client'

import { memo, useEffect, useRef, useCallback } from 'react'
import { cn } from '@veritio/ui'

export interface TrailClick {
  id: string
  normalizedX: number
  normalizedY: number
  timestamp: string
  participantId: string
  wasHotspot?: boolean
}

interface ClickTrailRendererProps {
  clicks: TrailClick[]
  width: number
  height: number
  visible: boolean
  lineColor?: string
  lineOpacity?: number
  lineWidth?: number
  showArrows?: boolean
  arrowSize?: number
  showNumbers?: boolean
  fadeAmount?: number
  hotspotColor?: string
  missClickColor?: string
  className?: string
}
export const ClickTrailRenderer = memo(function ClickTrailRenderer({
  clicks,
  width,
  height,
  visible,
  lineColor = '#6366f1',
  lineOpacity = 0.6,
  lineWidth = 2,
  showArrows = true,
  arrowSize = 8,
  showNumbers = true,
  fadeAmount = 0.3,
  hotspotColor = '#22c55e',
  missClickColor = '#ef4444',
  className,
}: ClickTrailRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const normalizedToPixel = useCallback(
    (normalizedX: number, normalizedY: number): [number, number] => {
      return [(normalizedX / 100) * width, (normalizedY / 100) * height]
    },
    [width, height]
  )
  const drawArrow = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      fromX: number,
      fromY: number,
      toX: number,
      toY: number,
      size: number
    ) => {
      const angle = Math.atan2(toY - fromY, toX - fromX)
      const arrowX = toX - Math.cos(angle) * 10 // Offset from destination
      const arrowY = toY - Math.sin(angle) * 10

      ctx.beginPath()
      ctx.moveTo(arrowX, arrowY)
      ctx.lineTo(
        arrowX - size * Math.cos(angle - Math.PI / 6),
        arrowY - size * Math.sin(angle - Math.PI / 6)
      )
      ctx.lineTo(
        arrowX - size * Math.cos(angle + Math.PI / 6),
        arrowY - size * Math.sin(angle + Math.PI / 6)
      )
      ctx.closePath()
      ctx.fill()
    },
    []
  )
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || width === 0 || height === 0) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas dimensions
    canvas.width = width
    canvas.height = height

    // Clear canvas
    ctx.clearRect(0, 0, width, height)

    // Don't render if not visible or no clicks
    if (!visible || clicks.length === 0) return

    // Group clicks by participant and sort by timestamp
    const participantClicks = new Map<string, TrailClick[]>()
    clicks.forEach((click) => {
      if (!participantClicks.has(click.participantId)) {
        participantClicks.set(click.participantId, [])
      }
      participantClicks.get(click.participantId)!.push(click)
    })

    // Sort each participant's clicks by timestamp
    participantClicks.forEach((pClicks) => {
      pClicks.sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      )
    })

    // Draw trails for each participant
    participantClicks.forEach((pClicks) => {
      if (pClicks.length < 2) return

      for (let i = 0; i < pClicks.length - 1; i++) {
        const fromClick = pClicks[i]
        const toClick = pClicks[i + 1]

        const [fromX, fromY] = normalizedToPixel(
          fromClick.normalizedX,
          fromClick.normalizedY
        )
        const [toX, toY] = normalizedToPixel(toClick.normalizedX, toClick.normalizedY)

        // Calculate fade based on position in sequence
        const fadeProgress = i / (pClicks.length - 1)
        const opacity = lineOpacity * (1 - fadeProgress * fadeAmount)

        // Draw line
        ctx.beginPath()
        ctx.moveTo(fromX, fromY)
        ctx.lineTo(toX, toY)
        ctx.strokeStyle = `${lineColor}${Math.round(opacity * 255)
          .toString(16)
          .padStart(2, '0')}`
        ctx.lineWidth = lineWidth
        ctx.lineCap = 'round'
        ctx.setLineDash([4, 4]) // Dashed line
        ctx.stroke()
        ctx.setLineDash([]) // Reset dash

        // Draw arrow
        if (showArrows) {
          ctx.fillStyle = `${lineColor}${Math.round(opacity * 255)
            .toString(16)
            .padStart(2, '0')}`
          drawArrow(ctx, fromX, fromY, toX, toY, arrowSize)
        }
      }
    })

    // Draw click dots and numbers on top
    let globalIndex = 1
    const allClicksSorted = [...clicks].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    )

    allClicksSorted.forEach((click, idx) => {
      const [px, py] = normalizedToPixel(click.normalizedX, click.normalizedY)

      // Calculate fade
      const fadeProgress = idx / Math.max(allClicksSorted.length - 1, 1)
      const opacity = 1 - fadeProgress * fadeAmount

      // Draw click dot
      ctx.beginPath()
      ctx.arc(px, py, 6, 0, Math.PI * 2)
      const dotColor = click.wasHotspot ? hotspotColor : missClickColor
      ctx.fillStyle = `${dotColor}${Math.round(opacity * 255)
        .toString(16)
        .padStart(2, '0')}`
      ctx.fill()
      ctx.strokeStyle = `rgba(255, 255, 255, ${opacity * 0.9})`
      ctx.lineWidth = 2
      ctx.stroke()

      // Draw number label
      if (showNumbers) {
        ctx.font = 'bold 10px system-ui, sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'

        // Background circle for number
        ctx.beginPath()
        ctx.arc(px + 10, py - 10, 8, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(0, 0, 0, ${opacity * 0.7})`
        ctx.fill()

        // Number text
        ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`
        ctx.fillText(String(globalIndex), px + 10, py - 10)
        globalIndex++
      }
    })
  }, [
    clicks,
    width,
    height,
    visible,
    lineColor,
    lineOpacity,
    lineWidth,
    showArrows,
    arrowSize,
    showNumbers,
    fadeAmount,
    hotspotColor,
    missClickColor,
    normalizedToPixel,
    drawArrow,
  ])

  if (!visible) return null

  return (
    <canvas
      ref={canvasRef}
      className={cn('absolute inset-0 pointer-events-none', className)}
      style={{
        width: '100%',
        height: '100%',
      }}
    />
  )
})

export default ClickTrailRenderer
