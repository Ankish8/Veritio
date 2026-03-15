'use client'

import { cn } from '@/lib/utils'
import { SPATIAL_COLORS } from '@/lib/colors'

interface SpatialOverlayProps {
  sdd?: { center: { x: number; y: number }; radius: number }
  meanCenter?: { x: number; y: number }
  ellipse?: { center: { x: number; y: number }; semiMajor: number; semiMinor: number; rotation: number }
  width: number
  height: number
  className?: string
}

export function SpatialOverlay({ sdd, meanCenter, ellipse, width, height, className }: SpatialOverlayProps) {
  if (width <= 0 || height <= 0) return null

  const hasContent = sdd || meanCenter || ellipse
  if (!hasContent) return null

  // Scale 0-1 coordinates to pixel dimensions
  const sx = (v: number) => v * width
  const sy = (v: number) => v * height

  // For radius/distance values, use average of both dimensions to handle non-square aspect ratios
  const sr = (v: number) => v * Math.min(width, height)

  const crosshairSize = 8

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      className={cn('absolute inset-0 w-full h-full pointer-events-none', className)}
    >
      {/* Standard Distance Deviation circle */}
      {sdd && sdd.radius > 0 && (
        <circle
          cx={sx(sdd.center.x)}
          cy={sy(sdd.center.y)}
          r={sr(sdd.radius)}
          fill={SPATIAL_COLORS.sddFill}
          stroke={SPATIAL_COLORS.sddStroke}
          strokeWidth={2}
          strokeDasharray="6 4"
        />
      )}

      {/* Deviational ellipse */}
      {ellipse && (ellipse.semiMajor > 0 || ellipse.semiMinor > 0) && (
        <ellipse
          cx={sx(ellipse.center.x)}
          cy={sy(ellipse.center.y)}
          rx={sr(ellipse.semiMajor)}
          ry={sr(ellipse.semiMinor)}
          fill={SPATIAL_COLORS.ellipseFill}
          stroke={SPATIAL_COLORS.ellipseStroke}
          strokeWidth={2}
          strokeDasharray="6 4"
          transform={`rotate(${(ellipse.rotation * 180) / Math.PI}, ${sx(ellipse.center.x)}, ${sy(ellipse.center.y)})`}
        />
      )}

      {/* Mean center crosshair */}
      {meanCenter && (
        <g>
          <line
            x1={sx(meanCenter.x) - crosshairSize}
            y1={sy(meanCenter.y)}
            x2={sx(meanCenter.x) + crosshairSize}
            y2={sy(meanCenter.y)}
            stroke={SPATIAL_COLORS.meanCenterStroke}
            strokeWidth={2}
          />
          <line
            x1={sx(meanCenter.x)}
            y1={sy(meanCenter.y) - crosshairSize}
            x2={sx(meanCenter.x)}
            y2={sy(meanCenter.y) + crosshairSize}
            stroke={SPATIAL_COLORS.meanCenterStroke}
            strokeWidth={2}
          />
        </g>
      )}
    </svg>
  )
}
