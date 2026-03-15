'use client'

/**
 * Word Cloud Visualization Component
 *
 * D3-based word cloud visualization with:
 * - Spiral layout algorithm
 * - Color coding
 * - Click interaction
 * - Responsive sizing
 */

import { useState, useRef, useEffect } from 'react'
import * as d3 from 'd3'
import { MessageSquare } from 'lucide-react'

export interface WordData {
  text: string
  size: number
  count: number
  percentage: number
}

interface WordCloudVisualizationProps {
  wordData: WordData[]
  onWordClick?: (word: string) => void
  selectedWord: string | null
}

export function WordCloudVisualization({
  wordData,
  onWordClick,
  selectedWord,
}: WordCloudVisualizationProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 0, height: 350 })

  // Update dimensions on resize
  useEffect(() => {
    if (!containerRef.current) return

    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: 350,
        })
      }
    }

    updateDimensions()
    const resizeObserver = new ResizeObserver(updateDimensions)
    resizeObserver.observe(containerRef.current)

    return () => resizeObserver.disconnect()
  }, [])

  // Render word cloud using D3
  useEffect(() => {
    if (!containerRef.current || wordData.length === 0 || dimensions.width === 0) return

    const svg = d3.select(containerRef.current).select('svg')
    svg.selectAll('*').remove()

    const g = svg
      .attr('width', dimensions.width)
      .attr('height', dimensions.height)
      .append('g')
      .attr('transform', `translate(${dimensions.width / 2}, ${dimensions.height / 2})`)

    // Simple spiral layout for word cloud
    const words = layoutWords(wordData, dimensions.width, dimensions.height)

    // Color scale
    const colorScale = d3.scaleOrdinal([
      '#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#10b981',
      '#06b6d4', '#6366f1', '#a855f7', '#f43f5e', '#84cc16',
    ])

    g.selectAll('text')
      .data(words)
      .enter()
      .append('text')
      .style('font-size', d => `${d.size}px`)
      .style('font-family', 'system-ui, -apple-system, sans-serif')
      .style('font-weight', d => d.size > 30 ? '600' : '500')
      .style('fill', (d) => {
        if (selectedWord === d.text) return '#f97316'
        return colorScale(d.text)
      })
      .style('cursor', 'pointer')
      .style('opacity', d => selectedWord && selectedWord !== d.text ? 0.4 : 1)
      .style('transition', 'opacity 0.2s, fill 0.2s')
      .attr('text-anchor', 'middle')
      .attr('transform', d => `translate(${d.x}, ${d.y})`)
      .text(d => d.text)
      .on('click', (_, d) => onWordClick?.(d.text))
      .on('mouseenter', function() {
        d3.select(this).style('opacity', 1).style('text-decoration', 'underline')
      })
      .on('mouseleave', function(_, d) {
        d3.select(this)
          .style('opacity', selectedWord && selectedWord !== d.text ? 0.4 : 1)
          .style('text-decoration', 'none')
      })
      .append('title')
      .text(d => `"${d.text}" - ${d.count} occurrence${d.count > 1 ? 's' : ''} (${d.percentage.toFixed(1)}%)`)
  }, [wordData, dimensions, onWordClick, selectedWord])

  if (wordData.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p className="font-medium">Not enough data for word cloud</p>
        <p className="text-sm mt-1">
          Responses may be too short or contain only common/filtered words
        </p>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="w-full">
      <svg className="w-full" style={{ height: dimensions.height }} />
      <p className="text-xs text-muted-foreground text-center mt-2">
        Showing top {wordData.length} words • Click a word to drill down
      </p>
    </div>
  )
}

// Simple spiral layout algorithm for word positioning
function layoutWords(
  words: WordData[],
  width: number,
  height: number
): Array<WordData & { x: number; y: number }> {
  const placed: Array<{ x: number; y: number; width: number; height: number }> = []
  const result: Array<WordData & { x: number; y: number }> = []

  for (const word of words) {
    const wordWidth = word.text.length * word.size * 0.55
    const wordHeight = word.size * 1.2

    let angle = 0
    let radius = 0
    let attempts = 0
    let placed_word = false

    while (!placed_word && attempts < 500) {
      const x = Math.cos(angle) * radius
      const y = Math.sin(angle) * radius

      const bbox = {
        x: x - wordWidth / 2,
        y: y - wordHeight / 2,
        width: wordWidth,
        height: wordHeight,
      }

      const withinBounds =
        Math.abs(x) + wordWidth / 2 < width / 2 - 20 &&
        Math.abs(y) + wordHeight / 2 < height / 2 - 20

      const noOverlap = !placed.some(p => intersects(bbox, p))

      if (withinBounds && noOverlap) {
        placed.push(bbox)
        result.push({ ...word, x, y })
        placed_word = true
      }

      angle += 0.4
      radius += 0.4
      attempts++
    }
  }

  return result
}

function intersects(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number }
): boolean {
  return !(
    a.x + a.width < b.x ||
    b.x + b.width < a.x ||
    a.y + a.height < b.y ||
    b.y + b.height < a.y
  )
}
