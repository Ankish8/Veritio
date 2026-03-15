'use client'

import { useMemo, useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import type { StudyFlowQuestionRow, StudyFlowResponseRow } from '@veritio/study-types'
import { STOP_WORDS } from './text-utils'

interface WordCloudVisualizationProps {
  question: StudyFlowQuestionRow
  responses: StudyFlowResponseRow[]
}

interface WordData {
  text: string
  size: number
  count: number
}

/**
 * Word cloud visualization for text responses.
 * Displays frequently used words with size proportional to frequency.
 */
export function WordCloudVisualization({
  question: _question,
  responses,
}: WordCloudVisualizationProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 0, height: 300 })

  // Extract and count words from responses
  const wordData = useMemo(() => {
    const wordCounts = new Map<string, number>()

    for (const response of responses) {
      const text = response.response_value as string
      if (!text || typeof text !== 'string') continue

      // Tokenize: split by whitespace and punctuation, convert to lowercase
      const words = text
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 2 && !STOP_WORDS.has(word))

      for (const word of words) {
        wordCounts.set(word, (wordCounts.get(word) || 0) + 1)
      }
    }

    // Convert to array and sort by count
    const sortedWords = Array.from(wordCounts.entries())
      .map(([text, count]) => ({ text, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 50) // Limit to top 50 words

    if (sortedWords.length === 0) return []

    // Scale font sizes (min 12px, max 48px)
    const maxCount = sortedWords[0].count
    const minCount = sortedWords[sortedWords.length - 1].count

    return sortedWords.map(word => ({
      text: word.text,
      count: word.count,
      size: minCount === maxCount
        ? 24
        : 12 + ((word.count - minCount) / (maxCount - minCount)) * 36,
    }))
  }, [responses])

  // Update dimensions on resize
  useEffect(() => {
    if (!containerRef.current) return

    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: 300,
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
    const colorScale = d3.scaleOrdinal(d3.schemeCategory10)

    g.selectAll('text')
      .data(words)
      .enter()
      .append('text')
      .style('font-size', d => `${d.size}px`)
      .style('font-family', 'system-ui, sans-serif')
      .style('font-weight', '500')
      .style('fill', (_, i) => colorScale(String(i)))
      .style('cursor', 'default')
      .attr('text-anchor', 'middle')
      .attr('transform', d => `translate(${d.x}, ${d.y})`)
      .text(d => d.text)
      .append('title')
      .text(d => `${d.text}: ${d.count} occurrence${d.count > 1 ? 's' : ''}`)
  }, [wordData, dimensions])

  if (responses.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p className="text-sm">No responses yet</p>
      </div>
    )
  }

  if (wordData.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p className="text-sm">Not enough text data to generate word cloud</p>
        <p className="text-xs mt-1">Responses may be too short or contain only common words</p>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="w-full">
      <svg className="w-full" style={{ height: dimensions.height }} />
      <p className="text-xs text-muted-foreground text-center mt-2">
        Showing top {wordData.length} words from {responses.length} responses
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
    // Estimate word dimensions
    const wordWidth = word.text.length * word.size * 0.6
    const wordHeight = word.size * 1.2

    // Try to place using spiral pattern
    let angle = 0
    let radius = 0
    let attempts = 0
    let placed_word = false

    while (!placed_word && attempts < 500) {
      const x = Math.cos(angle) * radius
      const y = Math.sin(angle) * radius

      // Check if position is valid (within bounds and no overlap)
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

      angle += 0.5
      radius += 0.5
      attempts++
    }
  }

  return result
}

// Check if two rectangles intersect
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
