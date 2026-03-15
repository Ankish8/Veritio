'use client'

import { memo, useEffect, useRef, useCallback } from 'react'
import { cn } from '@veritio/ui'

export interface HeatmapClick {
  id: string
  normalizedX: number
  normalizedY: number
  wasHotspot?: boolean
}

interface HeatmapOverlayProps {
  clicks: HeatmapClick[]
  width: number
  height: number
  opacity?: number
  maxValue?: number
  blur?: number
  radius?: number
  showDots?: boolean
  hotspotColor?: string
  missClickColor?: string
  className?: string
}
export const HeatmapOverlay = memo(function HeatmapOverlay({
  clicks,
  width,
  height,
  opacity = 0.6,
  maxValue,
  blur = 25,
  radius = 20,
  showDots = false,
  hotspotColor = '#22c55e',
  missClickColor = '#ef4444',
  className,
}: HeatmapOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const heatCanvasRef = useRef<HTMLCanvasElement>(null)

  const normalizedToPixel = useCallback(
    (normalizedX: number, normalizedY: number): [number, number] => {
      return [(normalizedX / 100) * width, (normalizedY / 100) * height]
    },
    [width, height]
  )

  const createGradient = useCallback(
    (ctx: CanvasRenderingContext2D, x: number, y: number, intensity: number) => {
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius + blur)
      gradient.addColorStop(0, `rgba(255, 0, 0, ${intensity})`)
      gradient.addColorStop(0.5, `rgba(255, 255, 0, ${intensity * 0.5})`)
      gradient.addColorStop(1, 'rgba(0, 0, 255, 0)')
      return gradient
    },
    [radius, blur]
  )
  const applyColorGradient = useCallback(
    (ctx: CanvasRenderingContext2D, width: number, height: number) => {
      const imageData = ctx.getImageData(0, 0, width, height)
      const data = imageData.data

      // Color stops: blue (cold) -> cyan -> green -> yellow -> red (hot)
      const colorStops = [
        { pos: 0, r: 0, g: 0, b: 255 }, // blue
        { pos: 0.25, r: 0, g: 255, b: 255 }, // cyan
        { pos: 0.5, r: 0, g: 255, b: 0 }, // green
        { pos: 0.75, r: 255, g: 255, b: 0 }, // yellow
        { pos: 1, r: 255, g: 0, b: 0 }, // red
      ]

      for (let i = 0; i < data.length; i += 4) {
        const alpha = data[i + 3] / 255
        if (alpha === 0) continue

        // Find color based on intensity
        let r = 0,
          g = 0,
          b = 0
        for (let j = 0; j < colorStops.length - 1; j++) {
          const start = colorStops[j]
          const end = colorStops[j + 1]
          if (alpha >= start.pos && alpha <= end.pos) {
            const t = (alpha - start.pos) / (end.pos - start.pos)
            r = Math.round(start.r + (end.r - start.r) * t)
            g = Math.round(start.g + (end.g - start.g) * t)
            b = Math.round(start.b + (end.b - start.b) * t)
            break
          }
        }

        data[i] = r
        data[i + 1] = g
        data[i + 2] = b
        data[i + 3] = Math.round(alpha * 255 * opacity)
      }

      ctx.putImageData(imageData, 0, 0)
    },
    [opacity]
  )
  useEffect(() => {
    const canvas = canvasRef.current
    const heatCanvas = heatCanvasRef.current
    if (!canvas || !heatCanvas || width === 0 || height === 0) return

    const ctx = canvas.getContext('2d')
    const heatCtx = heatCanvas.getContext('2d')
    if (!ctx || !heatCtx) return

    // Set canvas dimensions
    canvas.width = width
    canvas.height = height
    heatCanvas.width = width
    heatCanvas.height = height

    // Clear canvases
    ctx.clearRect(0, 0, width, height)
    heatCtx.clearRect(0, 0, width, height)

    if (clicks.length === 0) return

    // Group clicks by position to calculate intensity
    const pointMap = new Map<string, number>()
    clicks.forEach((click) => {
      const [px, py] = normalizedToPixel(click.normalizedX, click.normalizedY)
      // Round to reduce unique points (binning)
      const key = `${Math.round(px / 5) * 5},${Math.round(py / 5) * 5}`
      pointMap.set(key, (pointMap.get(key) || 0) + 1)
    })

    // Calculate max for normalization
    const max = maxValue || Math.max(...pointMap.values())

    // Draw heat points to off-screen canvas
    heatCtx.globalCompositeOperation = 'lighter'
    pointMap.forEach((count, key) => {
      const [x, y] = key.split(',').map(Number)
      const intensity = Math.min(count / max, 1)

      const gradient = createGradient(heatCtx, x, y, intensity)
      heatCtx.fillStyle = gradient
      heatCtx.beginPath()
      heatCtx.arc(x, y, radius + blur, 0, Math.PI * 2)
      heatCtx.fill()
    })

    // Apply color gradient
    applyColorGradient(heatCtx, width, height)

    // Draw to main canvas
    ctx.drawImage(heatCanvas, 0, 0)

    // Optionally draw individual click dots
    if (showDots) {
      clicks.forEach((click) => {
        const [px, py] = normalizedToPixel(click.normalizedX, click.normalizedY)
        ctx.beginPath()
        ctx.arc(px, py, 4, 0, Math.PI * 2)
        ctx.fillStyle = click.wasHotspot ? hotspotColor : missClickColor
        ctx.fill()
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)'
        ctx.lineWidth = 1.5
        ctx.stroke()
      })
    }
  }, [
    clicks,
    width,
    height,
    opacity,
    maxValue,
    blur,
    radius,
    showDots,
    hotspotColor,
    missClickColor,
    normalizedToPixel,
    createGradient,
    applyColorGradient,
  ])

  return (
    <>
      {/* Off-screen canvas for heatmap computation */}
      <canvas ref={heatCanvasRef} style={{ display: 'none' }} />
      {/* Main visible canvas overlay */}
      <canvas
        ref={canvasRef}
        className={cn(
          'absolute inset-0 pointer-events-none',
          className
        )}
        style={{
          width: '100%',
          height: '100%',
        }}
      />
    </>
  )
})

export default HeatmapOverlay
