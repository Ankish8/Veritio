'use client'

import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import { CLUSTER_COLORS } from '@/lib/d3/color-schemes'
import { SPATIAL_COLORS } from '@/lib/colors'

interface ClusterOverlayProps {
  clusters: Array<{
    id: number
    points: Array<{ x: number; y: number }>
    centroid: { x: number; y: number }
    size: number
  }>
  width: number
  height: number
  className?: string
}

/**
 * Convex hull via Andrew's monotone chain algorithm.
 * Returns hull points in counter-clockwise order, or null if < 3 unique points.
 */
function convexHull(points: [number, number][]): [number, number][] | null {
  if (points.length < 3) return null

  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const n = sorted.length

  // Build lower hull
  const lower: [number, number][] = []
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
      lower.pop()
    }
    lower.push(p)
  }

  // Build upper hull
  const upper: [number, number][] = []
  for (let i = n - 1; i >= 0; i--) {
    const p = sorted[i]
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
      upper.pop()
    }
    upper.push(p)
  }

  // Remove last point of each half (it's the first point of the other)
  lower.pop()
  upper.pop()

  const hull = lower.concat(upper)
  return hull.length >= 3 ? hull : null
}

function cross(o: [number, number], a: [number, number], b: [number, number]): number {
  return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
}

export function ClusterOverlay({ clusters, width, height, className }: ClusterOverlayProps) {
  const clusterShapes = useMemo(() => {
    if (clusters.length === 0 || width <= 0 || height <= 0) return []

    return clusters.map((cluster, i) => {
      const color = CLUSTER_COLORS[i % CLUSTER_COLORS.length]
      const pixelPoints: [number, number][] = cluster.points.map((p) => [p.x * width, p.y * height])
      const hull = convexHull(pixelPoints)
      const cx = cluster.centroid.x * width
      const cy = cluster.centroid.y * height

      return { id: cluster.id, color, pixelPoints, hull, cx, cy, size: cluster.size }
    })
  }, [clusters, width, height])

  if (clusterShapes.length === 0) return null

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      className={cn('absolute inset-0 w-full h-full pointer-events-none', className)}
    >
      {clusterShapes.map((shape) => (
        <g key={shape.id}>
          {shape.hull ? (
            <path
              d={`M${shape.hull.map((p) => p.join(',')).join('L')}Z`}
              fill={shape.color}
              fillOpacity={0.15}
              stroke={shape.color}
              strokeWidth={2}
              strokeOpacity={0.7}
            />
          ) : (
            shape.pixelPoints.map(([px, py], j) => (
              <circle key={j} cx={px} cy={py} r={6} fill={shape.color} fillOpacity={0.4} />
            ))
          )}
          <text
            x={shape.cx}
            y={shape.cy}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="11px"
            fontWeight="600"
            fill={shape.color}
            stroke={SPATIAL_COLORS.clusterText}
            strokeWidth={2}
            paintOrder="stroke"
          >
            {shape.size}
          </text>
        </g>
      ))}
    </svg>
  )
}
