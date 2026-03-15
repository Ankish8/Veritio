'use client'

/**
 * Comparison Metrics
 *
 * Detailed side-by-side metric comparison between two designs.
 * Shows visual bars for easy comparison.
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ArrowUp, ArrowDown, Minus } from 'lucide-react'
import type { DesignWithMetrics } from './comparison-tab'

interface ComparisonMetricsProps {
  designA: DesignWithMetrics
  designB: DesignWithMetrics
  winner: string | null
}

interface MetricRow {
  label: string
  valueA: number
  valueB: number
  format: (value: number) => string
  higherIsBetter: boolean
}

export function ComparisonMetrics({
  designA,
  designB,
  winner: _winner,
}: ComparisonMetricsProps) {
  // Calculate response rates
  const responseRateA = designA.exposureCount > 0
    ? (designA.totalResponses / designA.exposureCount) * 100
    : 0
  const responseRateB = designB.exposureCount > 0
    ? (designB.totalResponses / designB.exposureCount) * 100
    : 0

  // Define metrics to compare
  const metrics: MetricRow[] = [
    {
      label: 'Total Exposures',
      valueA: designA.exposureCount,
      valueB: designB.exposureCount,
      format: (v) => v.toString(),
      higherIsBetter: true,
    },
    {
      label: 'Total Responses',
      valueA: designA.totalResponses,
      valueB: designB.totalResponses,
      format: (v) => v.toString(),
      higherIsBetter: true,
    },
    {
      label: 'Response Rate',
      valueA: responseRateA,
      valueB: responseRateB,
      format: (v) => `${v.toFixed(1)}%`,
      higherIsBetter: true,
    },
    {
      label: 'Avg. Response Time',
      valueA: designA.avgResponseTime / 1000,
      valueB: designB.avgResponseTime / 1000,
      format: (v) => `${v.toFixed(2)}s`,
      higherIsBetter: false, // Lower response time is better (faster)
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Detailed Comparison</CardTitle>
        <CardDescription>
          Side-by-side metric comparison
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2.5 pr-4 font-medium text-muted-foreground">Metric</th>
                <th className="text-right py-2.5 px-4 font-medium text-muted-foreground">{designA.name || `Design ${designA.position + 1}`}</th>
                <th className="text-right py-2.5 px-4 font-medium text-muted-foreground">{designB.name || `Design ${designB.position + 1}`}</th>
                <th className="text-right py-2.5 pl-4 font-medium text-muted-foreground">Diff</th>
              </tr>
            </thead>
            <tbody>
              {metrics.map((metric) => (
                <MetricTableRow key={metric.label} metric={metric} />
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

function MetricTableRow({ metric }: { metric: MetricRow }) {
  const { label, valueA, valueB, format, higherIsBetter } = metric

  const aIsBetter = higherIsBetter ? valueA > valueB : valueA < valueB
  const bIsBetter = higherIsBetter ? valueB > valueA : valueB < valueA
  const isEqual = valueA === valueB
  const maxValue = Math.max(valueA, valueB)

  // Absolute difference
  const diff = valueA - valueB
  const diffPct = valueB !== 0 ? ((valueA - valueB) / valueB) * 100 : 0

  // Bar widths (inline visual)
  const barWidthA = maxValue > 0 ? (valueA / maxValue) * 100 : 0
  const barWidthB = maxValue > 0 ? (valueB / maxValue) * 100 : 0

  return (
    <tr className="border-b last:border-0">
      <td className="py-3 pr-4 font-medium">{label}</td>
      <td className="py-3 px-4 text-right">
        <div className="flex items-center justify-end gap-2">
          <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden hidden sm:block">
            <div
              className={`h-full rounded-full ${aIsBetter ? 'bg-green-500' : 'bg-primary/60'}`}
              style={{ width: `${barWidthA}%` }}
            />
          </div>
          <span className={aIsBetter && !isEqual ? 'text-green-600 font-semibold' : ''}>
            {format(valueA)}
          </span>
        </div>
      </td>
      <td className="py-3 px-4 text-right">
        <div className="flex items-center justify-end gap-2">
          <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden hidden sm:block">
            <div
              className={`h-full rounded-full ${bIsBetter ? 'bg-green-500' : 'bg-primary/60'}`}
              style={{ width: `${barWidthB}%` }}
            />
          </div>
          <span className={bIsBetter && !isEqual ? 'text-green-600 font-semibold' : ''}>
            {format(valueB)}
          </span>
        </div>
      </td>
      <td className="py-3 pl-4 text-right">
        {isEqual ? (
          <span className="text-muted-foreground flex items-center justify-end gap-1">
            <Minus className="h-3 w-3" />
            0
          </span>
        ) : (
          <span className={`flex items-center justify-end gap-0.5 ${
            (aIsBetter ? 'text-green-600' : 'text-red-500')
          }`}>
            {diff > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
            {Math.abs(diffPct).toFixed(0)}%
          </span>
        )}
      </td>
    </tr>
  )
}
