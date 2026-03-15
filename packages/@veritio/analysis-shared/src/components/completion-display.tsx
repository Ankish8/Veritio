'use client'

import { Suspense } from 'react'
import {
  LazyPieChart,
  LazyPie,
  LazyCell,
  LazyResponsiveContainer,
  PieChartLoadingSkeleton,
} from '@veritio/ui/components/lazy-charts'
import { COMPLETION_COLORS } from '@veritio/core/colors'

interface CompletionDisplayProps {
  completed: number
  total: number
}

function formatCompact(n: number): string {
  if (n < 1000) return String(n)
  if (n < 10000) return `${(n / 1000).toFixed(1)}k`
  if (n < 1000000) return `${Math.round(n / 1000)}k`
  return `${(n / 1000000).toFixed(1)}M`
}

export function CompletionDisplay({ completed, total }: CompletionDisplayProps) {
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0
  const abandoned = total - completed

  const data = [
    { name: 'Completed', value: completed },
    { name: 'Abandoned', value: Math.max(0, abandoned) }
  ]

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6">
        <div className="w-14 h-14 rounded-full bg-muted/50 flex items-center justify-center mb-3">
          <span className="text-2xl font-bold text-muted-foreground/40">0</span>
        </div>
        <span className="text-muted-foreground text-sm">Waiting for participants</span>
      </div>
    )
  }

  return (
    <div className="py-3">
      {/* Donut chart - primary visual */}
      <div
        className="relative mx-auto overflow-hidden"
        style={{ width: 130, height: 130, minHeight: 130 }}
      >
        <Suspense fallback={<PieChartLoadingSkeleton size={130} />}>
          <LazyResponsiveContainer width="100%" height="100%">
            <LazyPieChart>
              <LazyPie
                data={data}
                innerRadius={42}
                outerRadius={60}
                startAngle={90}
                endAngle={-270}
                dataKey="value"
                strokeWidth={0}
                isAnimationActive={false}
              >
                <LazyCell fill={COMPLETION_COLORS.completed} />
                <LazyCell fill={COMPLETION_COLORS.abandoned} />
              </LazyPie>
            </LazyPieChart>
          </LazyResponsiveContainer>
        </Suspense>
        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className={`font-bold ${completed >= 10000 ? 'text-lg' : 'text-2xl'}`}>{formatCompact(completed)}</span>
          <span className="text-[11px] text-muted-foreground">of {formatCompact(total)}</span>
        </div>
      </div>

      {/* Percentage badge */}
      <div className="text-center mt-4">
        <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium">
          {percentage}% completion rate
        </span>
      </div>
    </div>
  )
}
