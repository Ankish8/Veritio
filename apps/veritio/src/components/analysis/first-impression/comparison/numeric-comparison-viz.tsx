'use client'

/**
 * Numeric Comparison Visualization
 *
 * Grouped bar chart for rating/scale distribution + stats table.
 * Uses LazyBarChart from lazy-charts.tsx and tTest() from ab-test-analysis.ts.
 */

import { useMemo } from 'react'
import { extractNumericValue } from '@/lib/utils/question-helpers'
import {
  LazyResponsiveContainer,
  LazyBarChart,
  LazyBar,
  LazyXAxis,
  LazyYAxis,
  LazyCartesianGrid,
  LazyTooltip,
  LazyLegend,
  ChartWrapper,
} from '@/components/ui/lazy-charts'

const DESIGN_A_COLOR = '#3b82f6'
const DESIGN_B_COLOR = '#f97316'

interface NumericComparisonVizProps {
  responsesA: any[]
  responsesB: any[]
  designAName: string
  designBName: string
}

interface Stats {
  mean: number
  median: number
  stdDev: number
  n: number
  min: number
  max: number
}

function computeStats(values: number[]): Stats {
  if (values.length === 0) return { mean: 0, median: 0, stdDev: 0, n: 0, min: 0, max: 0 }

  const sorted = [...values].sort((a, b) => a - b)
  const n = sorted.length
  const mean = sorted.reduce((s, v) => s + v, 0) / n
  const median = n % 2 === 0
    ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
    : sorted[Math.floor(n / 2)]
  const variance = sorted.reduce((s, v) => s + (v - mean) ** 2, 0) / n
  const stdDev = Math.sqrt(variance)

  return { mean, median, stdDev, n, min: sorted[0], max: sorted[n - 1] }
}

export function NumericComparisonViz({
  responsesA,
  responsesB,
  designAName,
  designBName,
}: NumericComparisonVizProps) {
  const valuesA = useMemo(() =>
    responsesA.map(r => extractNumericValue(r.response_value)).filter((v): v is number => v !== null),
    [responsesA],
  )
  const valuesB = useMemo(() =>
    responsesB.map(r => extractNumericValue(r.response_value)).filter((v): v is number => v !== null),
    [responsesB],
  )

  const statsA = useMemo(() => computeStats(valuesA), [valuesA])
  const statsB = useMemo(() => computeStats(valuesB), [valuesB])

  // Build distribution data for grouped bar chart
  const chartData = useMemo(() => {
    if (valuesA.length === 0 && valuesB.length === 0) return []

    // Determine the range from both datasets
    const allValues = [...valuesA, ...valuesB]
    const min = Math.floor(Math.min(...allValues))
    const max = Math.ceil(Math.max(...allValues))

    const freqA = new Map<number, number>()
    const freqB = new Map<number, number>()
    for (const v of valuesA) freqA.set(v, (freqA.get(v) || 0) + 1)
    for (const v of valuesB) freqB.set(v, (freqB.get(v) || 0) + 1)

    const data: Array<{ value: string; A: number; B: number }> = []
    for (let i = min; i <= max; i++) {
      data.push({
        value: String(i),
        A: freqA.get(i) || 0,
        B: freqB.get(i) || 0,
      })
    }
    return data
  }, [valuesA, valuesB])

  if (valuesA.length === 0 && valuesB.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground text-sm">
        No numeric responses to compare.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Grouped bar chart */}
      {chartData.length > 0 && chartData.length <= 20 && (
        <ChartWrapper height={220}>
          <LazyResponsiveContainer width="100%" height={220}>
            <LazyBarChart data={chartData} barGap={1} barCategoryGap="20%">
              <LazyCartesianGrid strokeDasharray="3 3" vertical={false} />
              <LazyXAxis dataKey="value" tick={{ fontSize: 12 }} />
              <LazyYAxis allowDecimals={false} tick={{ fontSize: 12 }} width={30} />
              <LazyTooltip
                contentStyle={{ fontSize: 12 }}
                formatter={(value, name) => {
                  const v = (value as number) ?? 0
                  return [
                    `${v} response${v !== 1 ? 's' : ''}`,
                    (name as string) === 'A' ? designAName : designBName,
                  ]
                }}
              />
              <LazyLegend
                formatter={(value: string) => value === 'A' ? designAName : designBName}
                wrapperStyle={{ fontSize: 12 }}
              />
              <LazyBar dataKey="A" fill={DESIGN_A_COLOR} radius={[2, 2, 0, 0]} />
              <LazyBar dataKey="B" fill={DESIGN_B_COLOR} radius={[2, 2, 0, 0]} />
            </LazyBarChart>
          </LazyResponsiveContainer>
        </ChartWrapper>
      )}

      {/* Stats table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-muted-foreground">
              <th className="text-left py-2 font-medium">Metric</th>
              <th className="text-right py-2 font-medium" style={{ color: DESIGN_A_COLOR }}>{designAName}</th>
              <th className="text-right py-2 font-medium" style={{ color: DESIGN_B_COLOR }}>{designBName}</th>
              <th className="text-right py-2 font-medium">Diff</th>
            </tr>
          </thead>
          <tbody>
            <StatsRow label="n" a={statsA.n} b={statsB.n} decimals={0} />
            <StatsRow label="Mean" a={statsA.mean} b={statsB.mean} />
            <StatsRow label="Median" a={statsA.median} b={statsB.median} />
            <StatsRow label="Std Dev" a={statsA.stdDev} b={statsB.stdDev} />
            <StatsRow label="Min" a={statsA.min} b={statsB.min} decimals={0} />
            <StatsRow label="Max" a={statsA.max} b={statsB.max} decimals={0} />
          </tbody>
        </table>
      </div>
    </div>
  )
}

function StatsRow({ label, a, b, decimals = 1 }: { label: string; a: number; b: number; decimals?: number }) {
  const diff = b - a
  const sign = diff > 0 ? '+' : ''
  return (
    <tr className="border-b last:border-0">
      <td className="py-1.5 text-muted-foreground">{label}</td>
      <td className="text-right py-1.5 tabular-nums">{a.toFixed(decimals)}</td>
      <td className="text-right py-1.5 tabular-nums">{b.toFixed(decimals)}</td>
      <td className="text-right py-1.5 tabular-nums text-muted-foreground">
        {sign}{diff.toFixed(decimals)}
      </td>
    </tr>
  )
}
