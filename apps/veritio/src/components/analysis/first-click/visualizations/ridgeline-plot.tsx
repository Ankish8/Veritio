'use client'

import { useEffect, useRef, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { loadD3, type D3Module } from '@/lib/d3/load-d3'

interface RidgelinePlotProps {
  tasks: Array<{ taskId: string; label: string; times: number[] }>
  width?: number
  height?: number
  className?: string
}

/**
 * Gaussian kernel density estimation.
 * Returns [x, density] pairs sampled at `nSamples` evenly-spaced points.
 */
function gaussianKDE(
  data: number[],
  bandwidth: number,
  xMin: number,
  xMax: number,
  nSamples = 120
): [number, number][] {
  if (data.length === 0) return []

  const step = (xMax - xMin) / (nSamples - 1)
  const result: [number, number][] = []
  const factor = 1 / (bandwidth * Math.sqrt(2 * Math.PI) * data.length)

  for (let i = 0; i < nSamples; i++) {
    const x = xMin + i * step
    let sum = 0
    for (const d of data) {
      const z = (x - d) / bandwidth
      sum += Math.exp(-0.5 * z * z)
    }
    result.push([x, sum * factor])
  }

  return result
}

function formatMs(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`
}

const PALETTE = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316']

export function RidgelinePlot({
  tasks: rawTasks,
  width: propWidth,
  height: propHeight,
  className,
}: RidgelinePlotProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const d3Ref = useRef<D3Module | null>(null)

  const tasks = rawTasks.filter(t => t.times.length > 0)

  const draw = useCallback(() => {
    const d3 = d3Ref.current
    if (!d3 || !svgRef.current || !containerRef.current || tasks.length === 0) return

    const containerWidth = propWidth ?? containerRef.current.clientWidth ?? 600
    const rowHeight = 72
    const overlap = 22
    const margin = { top: 12, right: 24, bottom: 32, left: 200 }
    const w = containerWidth - margin.left - margin.right
    const totalHeight =
      propHeight ?? margin.top + margin.bottom + tasks.length * (rowHeight - overlap) + overlap

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()
    svg.attr('width', containerWidth).attr('height', totalHeight)

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`)

    // Compute text color from container's computed style (dark mode aware)
    const computedStyle = getComputedStyle(containerRef.current)
    const textColor = computedStyle.color || '#71717a'

    // Global time range
    const allTimes = tasks.flatMap(t => t.times)
    const globalMax = d3.max(allTimes) ?? 1000
    const xScale = d3.scaleLinear().domain([0, globalMax]).range([0, w]).nice()

    // Bandwidth: Silverman's rule of thumb
    const stdAll = d3.deviation(allTimes) ?? globalMax / 4
    const bandwidth = 1.06 * stdAll * Math.pow(allTimes.length, -1 / 5)

    // KDE per task and global max density
    const kdeData = tasks.map(t =>
      gaussianKDE(t.times, bandwidth, 0, xScale.domain()[1] as number)
    )
    const maxDensity = d3.max(kdeData.flatMap(kde => kde.map(([, d]) => d))) ?? 1
    const yDensityScale = d3.scaleLinear().domain([0, maxDensity]).range([0, rowHeight - 6])

    // Draw each ridge
    tasks.forEach((task, i) => {
      const kde = kdeData[i]
      if (kde.length === 0) return

      const yOffset = i * (rowHeight - overlap)
      const color = PALETTE[i % PALETTE.length]

      const area = d3
        .area<[number, number]>()
        .x(([x]) => xScale(x))
        .y0(rowHeight)
        .y1(([, d]) => rowHeight - yDensityScale(d))
        .curve(d3.curveBasis)

      const ridgeG = g
        .append('g')
        .attr('class', 'ridge-group')
        .attr('transform', `translate(0,${yOffset})`)
        .style('cursor', 'default')

      // Filled area
      ridgeG
        .append('path')
        .datum(kde)
        .attr('class', 'ridge-path')
        .attr('d', area)
        .attr('fill', color)
        .attr('fill-opacity', 0.55)
        .attr('stroke', color)
        .attr('stroke-width', 1.5)

      // Task label
      const displayLabel =
        task.label.length > 30 ? task.label.slice(0, 30) + '...' : task.label
      ridgeG
        .append('text')
        .attr('x', -12)
        .attr('y', rowHeight - 4)
        .attr('text-anchor', 'end')
        .attr('font-size', '12px')
        .attr('fill', textColor)
        .text(displayLabel)

      // Hover interactions
      const tooltip = tooltipRef.current
      const median = d3.median(task.times) ?? 0
      const mean = d3.mean(task.times) ?? 0

      ridgeG
        .on('mouseenter', function () {
          // Highlight this curve, dim others
          svg.selectAll('.ridge-path').attr('fill-opacity', 0.15).attr('stroke-opacity', 0.3)
          d3.select(this)
            .select('.ridge-path')
            .attr('fill-opacity', 0.8)
            .attr('stroke-opacity', 1)
            .attr('stroke-width', 2)

          if (tooltip) {
            tooltip.style.opacity = '1'
            tooltip.innerHTML = `
              <p class="font-medium text-xs mb-1">${task.label}</p>
              <div class="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px]">
                <span class="text-muted-foreground">Clicks</span>
                <span class="text-right font-medium">${task.times.length}</span>
                <span class="text-muted-foreground">Median</span>
                <span class="text-right font-medium">${formatMs(median)}</span>
                <span class="text-muted-foreground">Mean</span>
                <span class="text-right font-medium">${formatMs(mean)}</span>
              </div>
            `
          }
        })
        .on('mousemove', function (event: MouseEvent) {
          if (tooltip) {
            const bounds = containerRef.current!.getBoundingClientRect()
            const x = event.clientX - bounds.left
            const y = event.clientY - bounds.top
            // Position tooltip to right of cursor, flip if near edge
            const tooltipW = 180
            const leftPos = x + 16 + tooltipW > bounds.width ? x - tooltipW - 8 : x + 16
            tooltip.style.left = `${leftPos}px`
            tooltip.style.top = `${y - 12}px`
          }
        })
        .on('mouseleave', function () {
          svg.selectAll('.ridge-path').attr('fill-opacity', 0.55).attr('stroke-opacity', 1).attr('stroke-width', 1.5)
          if (tooltip) {
            tooltip.style.opacity = '0'
          }
        })
    })

    // X-axis
    const xAxis = d3
      .axisBottom(xScale)
      .ticks(6)
      .tickFormat(d => `${(d as number) / 1000}s`)

    g.append('g')
      .attr(
        'transform',
        `translate(0,${tasks.length * (rowHeight - overlap) + overlap})`
      )
      .call(xAxis)
      .selectAll('text')
      .attr('font-size', '11px')
      .attr('fill', textColor)

    g.selectAll('.domain, .tick line').attr('stroke', textColor).attr('stroke-opacity', 0.2)
  }, [tasks, propWidth, propHeight])

  // Load D3 and draw
  useEffect(() => {
    loadD3().then(mod => {
      d3Ref.current = mod
      draw()
    })
  }, [draw])

  // Redraw on resize
  useEffect(() => {
    if (!containerRef.current) return
    const observer = new ResizeObserver(() => {
      if (d3Ref.current) draw()
    })
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [draw])

  if (tasks.length === 0) return null

  return (
    <div ref={containerRef} className={cn('relative overflow-x-auto text-foreground', className)}>
      <svg ref={svgRef} />
      <div
        ref={tooltipRef}
        className="absolute z-20 bg-popover border rounded-lg px-3 py-2 shadow-lg pointer-events-none opacity-0 transition-opacity duration-150 w-[180px]"
        style={{ top: 0, left: 0 }}
      />
    </div>
  )
}
