'use client'

/**
 * Lazy-loaded Recharts components
 *
 * Performance optimization: Recharts is a heavy library (~200KB) that causes
 * significant main thread blocking during initial render. By lazy loading
 * these components, we defer their parsing and execution until they're needed,
 * improving LCP and reducing render delay.
 *
 * Usage:
 * ```tsx
 * import { LazyBarChart, LazyPieChart } from '@/components/ui/lazy-charts'
 *
 * <Suspense fallback={<ChartSkeleton />}>
 *   <LazyBarChart data={data}>
 *     <Bar dataKey="value" />
 *   </LazyBarChart>
 * </Suspense>
 * ```
 */

import dynamic from 'next/dynamic'
import { Skeleton } from './skeleton'



// Chart skeleton for loading state
export function ChartLoadingSkeleton({ height = 256 }: { height?: number }) {
  return (
    <div className="w-full animate-pulse" style={{ height }}>
      <div className="flex h-full items-end justify-around gap-2 px-4 pb-8">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton
            key={i}
            className="w-full"
            style={{ height: `${30 + Math.random() * 60}%` }} // eslint-disable-line react-hooks/purity
          />
        ))}
      </div>
    </div>
  )
}

// Pie chart skeleton
export function PieChartLoadingSkeleton({ size = 200 }: { size?: number }) {
  return (
    <div
      className="flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <Skeleton className="rounded-full" style={{ width: size * 0.8, height: size * 0.8 }} />
    </div>
  )
}

// Export individual lazy components
// ResponsiveContainer - used by all charts
export const LazyResponsiveContainer = dynamic(
  () => import('recharts').then((mod) => mod.ResponsiveContainer),
  { ssr: false }
)

// Bar Chart components
export const LazyBarChart = dynamic(
  () => import('recharts').then((mod) => mod.BarChart),
  { ssr: false, loading: () => <ChartLoadingSkeleton /> }
)

export const LazyBar = dynamic(
  () => import('recharts').then((mod) => mod.Bar),
  { ssr: false }
)

// Pie Chart components
export const LazyPieChart = dynamic(
  () => import('recharts').then((mod) => mod.PieChart),
  { ssr: false, loading: () => <PieChartLoadingSkeleton /> }
)

export const LazyPie = dynamic(
  () => import('recharts').then((mod) => mod.Pie),
  { ssr: false }
)

// Cell component exported directly (not lazy loaded)
// Cell is a lightweight component and MUST be exported directly because:
// 1. recharts checks component type internally to apply colors
// 2. dynamic() wrapping breaks the type check, causing colors to be ignored
// 3. This is why charts were rendering in black/grey instead of colorful
export { Cell } from 'recharts'

// Keep LazyCell as an alias for backward compatibility
export { Cell as LazyCell } from 'recharts'

// Line Chart components
export const LazyLineChart = dynamic(
  () => import('recharts').then((mod) => mod.LineChart),
  { ssr: false, loading: () => <ChartLoadingSkeleton /> }
)

export const LazyLine = dynamic(
  () => import('recharts').then((mod) => mod.Line),
  { ssr: false }
)

// Area Chart components
export const LazyAreaChart = dynamic(
  () => import('recharts').then((mod) => mod.AreaChart),
  { ssr: false, loading: () => <ChartLoadingSkeleton /> }
)

export const LazyArea = dynamic(
  () => import('recharts').then((mod) => mod.Area),
  { ssr: false }
)

// Shared components
export const LazyXAxis = dynamic(
  () => import('recharts').then((mod) => mod.XAxis),
  { ssr: false }
)

export const LazyYAxis = dynamic(
  () => import('recharts').then((mod) => mod.YAxis),
  { ssr: false }
)

export const LazyCartesianGrid = dynamic(
  () => import('recharts').then((mod) => mod.CartesianGrid),
  { ssr: false }
)

export const LazyTooltip = dynamic(
  () => import('recharts').then((mod) => mod.Tooltip),
  { ssr: false }
)

export const LazyLegend = dynamic(
  () => import('recharts').then((mod) => mod.Legend),
  { ssr: false }
)

export const LazyReferenceLine = dynamic(
  () => import('recharts').then((mod) => mod.ReferenceLine),
  { ssr: false }
)

/**
 * Wrapper component for charts that need to be measured
 * Delays animation until after first render to prevent forced reflows
 */
export function ChartWrapper({
  children,
  height = 300,
  className = '',
}: {
  children: React.ReactNode
  height?: number
  className?: string
}) {
  return (
    <div
      className={`w-full ${className}`}
      style={{
        height,
        // Prevent layout shifts by reserving space
        minHeight: height,
        // Contain layout to prevent reflow propagation
        contain: 'layout style',
      }}
    >
      {children}
    </div>
  )
}
