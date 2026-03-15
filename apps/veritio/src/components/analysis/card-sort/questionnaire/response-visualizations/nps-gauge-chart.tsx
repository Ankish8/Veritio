'use client'

import { useMemo } from 'react'
import type { StudyFlowQuestionRow, StudyFlowResponseRow } from '@veritio/study-types'
import { calculateNPSCounts, getNPSScoreColor } from './nps-utils'
import { NPS_GAUGE_COLORS } from '@/lib/colors'

interface NPSGaugeChartProps {
  question: StudyFlowQuestionRow
  responses: StudyFlowResponseRow[]
}

export function NPSGaugeChart({
  responses,
}: NPSGaugeChartProps) {
  const { npsScore, promoters, passives, detractors, total } = useMemo(
    () => calculateNPSCounts(responses),
    [responses]
  )

  if (responses.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p className="text-sm">No responses yet</p>
      </div>
    )
  }

  const gaugeAngle = ((npsScore + 100) / 200) * 180
  const scoreColor = getNPSScoreColor(npsScore)

  return (
    <div className="space-y-6" data-pdf-chart="nps-gauge">
      <div className="flex justify-center">
        <svg viewBox="0 0 200 120" className="w-full max-w-[300px]">
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke={NPS_GAUGE_COLORS.background}
            strokeWidth="16"
            strokeLinecap="round"
          />

          {/* Detractor zone */}
          <path
            d="M 20 100 A 80 80 0 0 1 100 20"
            fill="none"
            stroke={NPS_GAUGE_COLORS.detractor}
            strokeWidth="16"
            strokeLinecap="round"
          />

          <path
            d="M 100 20 A 80 80 0 0 1 156.57 44.43"
            fill="none"
            stroke={NPS_GAUGE_COLORS.passive}
            strokeWidth="16"
          />

          {/* Promoter zone (green): 50 to 100 */}
          <path
            d="M 156.57 44.43 A 80 80 0 0 1 180 100"
            fill="none"
            stroke={NPS_GAUGE_COLORS.promoter}
            strokeWidth="16"
            strokeLinecap="round"
          />

          {/* Needle */}
          <g transform={`rotate(${gaugeAngle - 90}, 100, 100)`}>
            <line
              x1="100"
              y1="100"
              x2="100"
              y2="35"
              stroke={scoreColor}
              strokeWidth="3"
              strokeLinecap="round"
            />
            <circle cx="100" cy="100" r="6" fill={scoreColor} />
          </g>

          {/* Labels */}
          <text x="20" y="115" fontSize="10" fill={NPS_GAUGE_COLORS.label} textAnchor="middle">-100</text>
          <text x="100" y="15" fontSize="10" fill={NPS_GAUGE_COLORS.label} textAnchor="middle">0</text>
          <text x="180" y="115" fontSize="10" fill={NPS_GAUGE_COLORS.label} textAnchor="middle">+100</text>
        </svg>
      </div>

      {/* Score display */}
      <div className="text-center">
        <div className="text-4xl font-bold" style={{ color: scoreColor }}>
          {npsScore > 0 ? '+' : ''}{npsScore}
        </div>
        <div className="text-sm text-muted-foreground mt-1">
          Net Promoter Score
        </div>
      </div>

      {/* Breakdown */}
      <div className="grid grid-cols-3 gap-4 text-center">
        <div className="space-y-1">
          <div className="text-2xl font-semibold text-red-500">{detractors}</div>
          <div className="text-xs text-muted-foreground">Detractors</div>
          <div className="text-xs text-muted-foreground">(0-6)</div>
        </div>
        <div className="space-y-1">
          <div className="text-2xl font-semibold text-amber-500">{passives}</div>
          <div className="text-xs text-muted-foreground">Passives</div>
          <div className="text-xs text-muted-foreground">(7-8)</div>
        </div>
        <div className="space-y-1">
          <div className="text-2xl font-semibold text-green-500">{promoters}</div>
          <div className="text-xs text-muted-foreground">Promoters</div>
          <div className="text-xs text-muted-foreground">(9-10)</div>
        </div>
      </div>

      {/* Total */}
      <div className="text-center text-sm text-muted-foreground">
        Based on {total} response{total !== 1 ? 's' : ''}
      </div>
    </div>
  )
}
