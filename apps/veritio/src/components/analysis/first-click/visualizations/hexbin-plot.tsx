'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { loadD3, type D3Module } from '@/lib/d3/load-d3'
import { COLOR_SCALE_NAMES, type ColorSchemeName } from '@/lib/d3/color-schemes'

interface HexbinPlotProps {
  clicks: Array<{ x: number; y: number; timeToClickMs?: number | null }>
  width: number
  height: number
  hexRadius?: number
  colorScheme?: ColorSchemeName
  className?: string
}

interface HexBin {
  col: number
  row: number
  cx: number
  cy: number
  count: number
  avgTimeMs: number
}

/**
 * Build a flat-top hexagonal grid and bin click points into cells.
 */
function hexagonalBin(
  clicks: Array<{ px: number; py: number; timeMs: number }>,
  radius: number,
  width: number,
  height: number,
): HexBin[] {
  const bins = new Map<string, { col: number; row: number; cx: number; cy: number; times: number[] }>()

  for (const { px, py, timeMs } of clicks) {
    // Convert pixel to fractional hex coordinates (flat-top axial)
    const q = ((2 / 3) * px) / radius
    const r = ((-1 / 3) * px + (Math.sqrt(3) / 3) * py) / radius

    // Round to nearest hex (cube coordinate rounding)
    let rx = Math.round(q)
    let ry = Math.round(r)
    const rz = Math.round(-q - r)

    const xDiff = Math.abs(rx - q)
    const yDiff = Math.abs(ry - r)
    const zDiff = Math.abs(rz - (-q - r))

    if (xDiff > yDiff && xDiff > zDiff) {
      rx = -ry - rz
    } else if (yDiff > zDiff) {
      ry = -rx - rz
    }

    const key = `${rx},${ry}`
    if (!bins.has(key)) {
      // Center of this hex in pixel space (flat-top)
      const cx = radius * (3 / 2) * rx
      const cy = radius * Math.sqrt(3) * (ry + rx / 2)
      bins.set(key, { col: rx, row: ry, cx, cy, times: [] })
    }
    bins.get(key)!.times.push(timeMs)
  }

  // Filter to hexes within viewport bounds (with some padding)
  const pad = radius * 2
  return Array.from(bins.values())
    .filter((b) => b.cx >= -pad && b.cx <= width + pad && b.cy >= -pad && b.cy <= height + pad)
    .map((b) => ({
      col: b.col,
      row: b.row,
      cx: b.cx,
      cy: b.cy,
      count: b.times.length,
      avgTimeMs: b.times.reduce((a, v) => a + v, 0) / b.times.length,
    }))
}

/**
 * SVG path for a flat-top hexagon centered at (0,0) with given radius.
 */
function hexPath(radius: number): string {
  const points: string[] = []
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i)
    points.push(`${radius * Math.cos(angle)},${radius * Math.sin(angle)}`)
  }
  return `M${points.join('L')}Z`
}

export function HexbinPlot({
  clicks,
  width,
  height,
  hexRadius = 20,
  colorScheme = 'viridis',
  className,
}: HexbinPlotProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [d3, setD3] = useState<D3Module | null>(null)

  useEffect(() => {
    loadD3().then(setD3)
  }, [])

  useEffect(() => {
    if (!d3 || !svgRef.current || clicks.length === 0 || width <= 0 || height <= 0) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()
    svg
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('preserveAspectRatio', 'xMidYMid meet')

    const scaledClicks = clicks.map((c) => ({
      px: c.x * width,
      py: c.y * height,
      timeMs: c.timeToClickMs ?? 0,
    }))

    // Scale hex radius proportionally to image dimensions (slider gives screen-pixel values)
    const scaleFactor = Math.max(width, height) / 600
    const scaledHexRadius = hexRadius * scaleFactor

    const bins = hexagonalBin(scaledClicks, scaledHexRadius, width, height)
    if (bins.length === 0) return

    const maxCount = d3.max(bins, (b) => b.count) ?? 1
    const maxTime = d3.max(bins, (b) => b.avgTimeMs) ?? 1

    // Color encodes click count
    const interpolator = d3[COLOR_SCALE_NAMES[colorScheme]] as (t: number) => string
    const colorScale = d3.scaleSequential(interpolator).domain([0, maxCount])

    // Size encodes average time (smaller = faster clicks)
    const sizeScale = d3.scaleLinear().domain([0, maxTime]).range([scaledHexRadius * 0.4, scaledHexRadius]).clamp(true)

    const path = hexPath(1) // unit hexagon, scaled per-bin

    svg
      .selectAll('path')
      .data(bins)
      .join('path')
      .attr('d', path)
      .attr('transform', (d) => {
        const s = sizeScale(d.avgTimeMs)
        return `translate(${d.cx},${d.cy}) scale(${s})`
      })
      .attr('fill', (d) => colorScale(d.count))
      .attr('fill-opacity', 0.8)
      .attr('stroke', '#fff')
      .attr('stroke-width', 0.5)
  }, [d3, clicks, width, height, hexRadius, colorScheme])

  if (clicks.length === 0) return null

  return <svg ref={svgRef} className={cn('absolute inset-0 w-full h-full', className)} />
}
