'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { loadD3, type D3Module } from '@/lib/d3/load-d3'
import { COLOR_SCALE_NAMES, type ColorSchemeName } from '@/lib/d3/color-schemes'

interface ContourDensityPlotProps {
  clicks: Array<{ x: number; y: number; timeToClickMs?: number | null; wasCorrect?: boolean }>
  width: number
  height: number
  bandwidth?: number
  colorScheme?: ColorSchemeName
  weightByTime?: boolean
  className?: string
}

export function ContourDensityPlot({
  clicks,
  width,
  height,
  bandwidth = 20,
  colorScheme = 'viridis',
  weightByTime = false,
  className,
}: ContourDensityPlotProps) {
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

    // Scale clicks from 0-1 to pixel coordinates
    const scaledClicks = clicks.map((c) => ({
      px: c.x * width,
      py: c.y * height,
      weight: weightByTime && c.timeToClickMs && c.timeToClickMs > 0 ? 1 / (c.timeToClickMs / 1000) : 1,
    }))

    // Scale bandwidth proportionally to image dimensions (slider gives screen-pixel values)
    const scaleFactor = Math.max(width, height) / 600
    const scaledBandwidth = bandwidth * scaleFactor

    // Build contour density
    const contourGen = d3
      .contourDensity<(typeof scaledClicks)[0]>()
      .x((d) => d.px)
      .y((d) => d.py)
      .size([width, height])
      .bandwidth(scaledBandwidth)
      .thresholds(12)

    if (weightByTime) {
      contourGen.weight((d) => d.weight)
    }

    const contours = contourGen(scaledClicks)

    // Color scale
    const interpolator = d3[COLOR_SCALE_NAMES[colorScheme]] as (t: number) => string
    const maxValue = d3.max(contours, (d) => d.value) ?? 1
    const colorScale = d3.scaleSequential(interpolator).domain([0, maxValue])

    svg
      .selectAll('path')
      .data(contours)
      .join('path')
      .attr('d', d3.geoPath())
      .attr('fill', (d) => colorScale(d.value))
      .attr('fill-opacity', 0.7)
      .attr('stroke', 'none')
  }, [d3, clicks, width, height, bandwidth, colorScheme, weightByTime])

  if (clicks.length === 0) return null

  return <svg ref={svgRef} className={cn('absolute inset-0 w-full h-full', className)} />
}
