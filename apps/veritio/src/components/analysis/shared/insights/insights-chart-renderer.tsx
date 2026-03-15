'use client'

import { Suspense } from 'react'
import {
  LazyResponsiveContainer,
  LazyBarChart,
  LazyBar,
  LazyPieChart,
  LazyPie,
  LazyLineChart,
  LazyLine,
  LazyXAxis,
  LazyYAxis,
  LazyCartesianGrid,
  LazyTooltip,
  LazyLegend,
  Cell,
  ChartLoadingSkeleton,
} from '@/components/ui/lazy-charts'
import type { ChartConfig } from '@/services/insights/chart-schema'

const DEFAULT_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899']

interface InsightsChartRendererProps {
  chart: ChartConfig
  height?: number
}

export function InsightsChartRenderer({ chart, height = 300 }: InsightsChartRendererProps) {
  const colors = chart.colors ?? DEFAULT_COLORS

  return (
    <div className="w-full [&_ul]:list-none [&_ul]:p-0">
      <h4 className="text-sm font-medium mb-3">{chart.title}</h4>
      <Suspense fallback={<ChartLoadingSkeleton height={height} />}>
        <LazyResponsiveContainer width="100%" height={height}>
          {renderChart(chart, colors)}
        </LazyResponsiveContainer>
      </Suspense>
    </div>
  )
}

function renderChart(chart: ChartConfig, colors: string[]) {
  switch (chart.type) {
    case 'bar':
      return renderBarChart(chart, colors, false)
    case 'horizontal_bar':
      return renderBarChart(chart, colors, true)
    case 'stacked_bar':
      return renderStackedBarChart(chart, colors)
    case 'grouped_bar':
      return renderGroupedBarChart(chart, colors)
    case 'pie':
      return renderPieChart(chart, colors)
    case 'line':
      return renderLineChart(chart, colors)
    default:
      return renderBarChart(chart, colors, false)
  }
}

function renderBarChart(chart: ChartConfig, colors: string[], horizontal: boolean) {
  const layout = horizontal ? 'vertical' : 'horizontal'
  return (
    <LazyBarChart data={chart.data} layout={layout}>
      <LazyCartesianGrid strokeDasharray="3 3" className="opacity-30" />
      {horizontal ? (
        <>
          <LazyXAxis type="number" label={chart.yLabel ? { value: chart.yLabel, position: 'insideBottom', offset: -5 } : undefined} />
          <LazyYAxis dataKey={chart.xKey} type="category" width={120} tick={{ fontSize: 12 }} label={chart.xLabel ? { value: chart.xLabel, angle: -90, position: 'insideLeft' } : undefined} />
        </>
      ) : (
        <>
          <LazyXAxis dataKey={chart.xKey} tick={{ fontSize: 12 }} label={chart.xLabel ? { value: chart.xLabel, position: 'insideBottom', offset: -5 } : undefined} />
          <LazyYAxis label={chart.yLabel ? { value: chart.yLabel, angle: -90, position: 'insideLeft' } : undefined} />
        </>
      )}
      <LazyTooltip />
      {chart.yKeys.map((key, i) => (
        <LazyBar key={key} dataKey={key} fill={colors[i % colors.length]} radius={[4, 4, 0, 0]} />
      ))}
    </LazyBarChart>
  )
}

function renderStackedBarChart(chart: ChartConfig, colors: string[]) {
  return (
    <LazyBarChart data={chart.data}>
      <LazyCartesianGrid strokeDasharray="3 3" className="opacity-30" />
      <LazyXAxis dataKey={chart.xKey} tick={{ fontSize: 12 }} />
      <LazyYAxis />
      <LazyTooltip />
      <LazyLegend />
      {chart.yKeys.map((key, i) => (
        <LazyBar key={key} dataKey={key} stackId="a" fill={colors[i % colors.length]} />
      ))}
    </LazyBarChart>
  )
}

function renderGroupedBarChart(chart: ChartConfig, colors: string[]) {
  return (
    <LazyBarChart data={chart.data}>
      <LazyCartesianGrid strokeDasharray="3 3" className="opacity-30" />
      <LazyXAxis dataKey={chart.xKey} tick={{ fontSize: 12 }} />
      <LazyYAxis />
      <LazyTooltip />
      <LazyLegend />
      {chart.yKeys.map((key, i) => (
        <LazyBar key={key} dataKey={key} fill={colors[i % colors.length]} radius={[4, 4, 0, 0]} />
      ))}
    </LazyBarChart>
  )
}

function renderPieChart(chart: ChartConfig, colors: string[]) {
  const yKey = chart.yKeys[0]
  return (
    <LazyPieChart>
      <LazyPie
        data={chart.data}
        dataKey={yKey}
        nameKey={chart.xKey}
        cx="50%"
        cy="50%"
        outerRadius={80}
        innerRadius={0}
        labelLine={true}
        label={({ name, percent, x, y, textAnchor }: { name?: string; percent?: number; x?: number; y?: number; textAnchor?: 'start' | 'middle' | 'end' | 'inherit' }) =>
          <text x={x} y={y} textAnchor={textAnchor} dominantBaseline="central" className="text-xs fill-foreground">
            {`${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`}
          </text>
        }
      >
        {chart.data.map((_, i) => (
          <Cell key={i} fill={colors[i % colors.length]} />
        ))}
      </LazyPie>
      <LazyTooltip />
      <LazyLegend />
    </LazyPieChart>
  )
}

function renderLineChart(chart: ChartConfig, colors: string[]) {
  return (
    <LazyLineChart data={chart.data}>
      <LazyCartesianGrid strokeDasharray="3 3" className="opacity-30" />
      <LazyXAxis dataKey={chart.xKey} tick={{ fontSize: 12 }} />
      <LazyYAxis />
      <LazyTooltip />
      <LazyLegend />
      {chart.yKeys.map((key, i) => (
        <LazyLine
          key={key}
          type="monotone"
          dataKey={key}
          stroke={colors[i % colors.length]}
          strokeWidth={2}
          dot={{ r: 3 }}
        />
      ))}
    </LazyLineChart>
  )
}
