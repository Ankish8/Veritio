'use client'

import { useMemo, Suspense } from 'react'
import {
  LazyPieChart,
  LazyPie,
  LazyCell,
  LazyResponsiveContainer,
  LazyLegend,
  LazyTooltip,
  PieChartLoadingSkeleton,
} from '@/components/ui/lazy-charts'
import type { StudyFlowQuestionRow, StudyFlowResponseRow } from '@veritio/study-types'
import { calculateNPSCounts, getNPSScoreColor } from './nps-utils'

interface NPSDonutChartProps {
  question: StudyFlowQuestionRow
  responses: StudyFlowResponseRow[]
}

const COLORS = {
  promoters: '#22c55e',
  passives: '#f59e0b',
  detractors: '#ef4444',
}

export function NPSDonutChart({
  responses,
}: NPSDonutChartProps) {
  const { chartData, npsScore, total } = useMemo(() => {
    const { promoters, passives, detractors, total, npsScore } = calculateNPSCounts(responses)

    const chartData = [
      {
        name: 'Promoters (9-10)',
        value: promoters,
        color: COLORS.promoters,
        percentage: total > 0 ? ((promoters / total) * 100).toFixed(1) : '0',
      },
      {
        name: 'Passives (7-8)',
        value: passives,
        color: COLORS.passives,
        percentage: total > 0 ? ((passives / total) * 100).toFixed(1) : '0',
      },
      {
        name: 'Detractors (0-6)',
        value: detractors,
        color: COLORS.detractors,
        percentage: total > 0 ? ((detractors / total) * 100).toFixed(1) : '0',
      },
    ].filter(item => item.value > 0)

    return { chartData, npsScore, total }
  }, [responses])

  if (responses.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p className="text-sm">No responses yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-4" data-pdf-chart="nps-donut">
      <div className="w-full h-[280px] relative" style={{ contain: 'layout' }}>
        <Suspense fallback={<PieChartLoadingSkeleton size={200} />}>
          <LazyResponsiveContainer width="100%" height="100%">
            <LazyPieChart>
              <LazyPie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
                isAnimationActive={false}
              >
                {chartData.map((entry, index) => (
                  <LazyCell key={`cell-${index}`} fill={entry.color} />
                ))}
              </LazyPie>
              <LazyTooltip
                formatter={(value, name, props) => [
                  `${(value as number) ?? 0} (${(props.payload as { percentage: string }).percentage}%)`,
                  name,
                ]}
              />
              <LazyLegend
                layout="horizontal"
                verticalAlign="bottom"
                align="center"
                formatter={(value: string) => (
                  <span className="text-sm text-muted-foreground">{value}</span>
                )}
              />
            </LazyPieChart>
          </LazyResponsiveContainer>
        </Suspense>

        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ marginBottom: '60px' }}>
          <div className="text-center">
            <div
              className="text-3xl font-bold"
              style={{ color: getNPSScoreColor(npsScore) }}
            >
              {npsScore > 0 ? '+' : ''}{npsScore}
            </div>
            <div className="text-xs text-muted-foreground">NPS</div>
          </div>
        </div>
      </div>

      <div className="flex justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-muted-foreground">
            {chartData.find(d => d.name.includes('Promoters'))?.percentage || 0}% Promoters
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-amber-500" />
          <span className="text-muted-foreground">
            {chartData.find(d => d.name.includes('Passives'))?.percentage || 0}% Passives
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span className="text-muted-foreground">
            {chartData.find(d => d.name.includes('Detractors'))?.percentage || 0}% Detractors
          </span>
        </div>
      </div>

      <div className="text-center text-xs text-muted-foreground">
        {total} total response{total !== 1 ? 's' : ''}
      </div>
    </div>
  )
}
