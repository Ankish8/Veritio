'use client'

/**
 * AOI (Area of Interest) Overlay
 *
 * Renders semi-transparent rectangles on click maps showing the areas
 * that were defined in the builder. Names appear on hover only.
 */

import { AOI_PALETTE, OVERLAY_COLORS } from '@/lib/colors'

interface AOI {
  id: string
  name: string
  x: number      // 0-1
  y: number       // 0-1
  width: number   // 0-1
  height: number  // 0-1
}

interface AoiOverlayProps {
  aois: AOI[]
  width: number
  height: number
  /** Which AOI to highlight (null = show all equally) */
  highlightAoiId?: string | null
}

export function AoiOverlay({ aois, width, height, highlightAoiId }: AoiOverlayProps) {
  if (aois.length === 0 || width <= 0 || height <= 0) return null

  const strokeW = Math.max(width, height) * 0.002
  const fontSize = Math.max(width, height) * 0.014
  const labelPadX = fontSize * 0.5
  const labelPadY = fontSize * 0.3

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      className="absolute inset-0 w-full h-full"
      style={{ pointerEvents: 'none' }}
    >
      <style>{`
        .aoi-label { opacity: 0; transition: opacity 0.15s ease; }
        .aoi-group:hover .aoi-label { opacity: 1; }
        .aoi-group { cursor: default; }
      `}</style>
      {aois.map((aoi, i) => {
        const color = AOI_PALETTE[i % AOI_PALETTE.length]
        const isDimmed = highlightAoiId != null && highlightAoiId !== aoi.id
        const groupOpacity = isDimmed ? 0.25 : 1

        const x = aoi.x * width
        const y = aoi.y * height
        const w = aoi.width * width
        const h = aoi.height * height

        const labelBgW = Math.min(aoi.name.length * fontSize * 0.6 + labelPadX * 2, w - strokeW * 2)
        const labelBgH = fontSize + labelPadY * 2

        return (
          <g
            key={aoi.id}
            className="aoi-group"
            opacity={groupOpacity}
            style={{ pointerEvents: 'auto' }}
          >
            {/* Hit area + visible border */}
            <rect
              x={x}
              y={y}
              width={w}
              height={h}
              fill={color.fill}
              stroke={color.stroke}
              strokeWidth={strokeW}
              strokeDasharray={`${strokeW * 4} ${strokeW * 2}`}
              rx={strokeW}
            />
            {/* Label (hidden by default, shown on hover) */}
            <g className="aoi-label">
              <rect
                x={x + strokeW}
                y={y + strokeW}
                width={labelBgW}
                height={labelBgH}
                fill={color.stroke}
                rx={strokeW}
              />
              <text
                x={x + labelPadX + strokeW}
                y={y + fontSize + labelPadY + strokeW}
                fill={OVERLAY_COLORS.white}
                fontSize={fontSize}
                fontFamily="system-ui, sans-serif"
                fontWeight="600"
              >
                {aoi.name}
              </text>
            </g>
          </g>
        )
      })}
    </svg>
  )
}
