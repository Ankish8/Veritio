'use client'

import useSWR from 'swr'
import { formatDistanceToNow } from 'date-fns'
import { AlertCircle } from 'lucide-react'
import { AdminPageHeader } from '@/components/admin/shared/admin-page-header'
import { StorageBreakdown } from '@/components/admin/system-health/storage-breakdown'
import { SlowQueriesTable } from '@/components/admin/system-health/slow-queries-table'
import { TableScanStats } from '@/components/admin/system-health/table-scan-stats'
import { CostTrackingDashboard } from '@/components/admin/system-health/cost-tracking-dashboard'
import { Skeleton } from '@/components/ui/skeleton'

interface PerformanceMetrics {
  storage: {
    total_size_bytes: number
    recordings_size_bytes: number
    yjs_documents_size_bytes: number
    chunk_etags_size_bytes: number
    largest_tables: Array<{
      table_name: string
      size_bytes: number
    }>
  }
  queries: {
    slow_queries: Array<{
      query: string
      avg_duration_ms: number
      call_count: number
    }>
    table_scan_stats: Array<{
      table_name: string
      seq_scan_count: number
      idx_scan_count: number
      ratio: number | null
    }>
  }
  timestamp: string
}

interface CostMetrics {
  current_costs: {
    database_storage_gb: number
    database_cost_per_month: number
    r2_storage_gb: number
    r2_cost_per_month: number
    total_monthly_cost: number
    cost_breakdown: Array<{
      category: string
      size_gb: number
      cost_per_month: number
      percentage: number
    }>
  }
  baseline_costs: {
    database_storage_gb: number
    database_cost_per_month: number
    r2_storage_gb: number
    r2_cost_per_month: number
    total_monthly_cost: number
    cost_breakdown: Array<{
      category: string
      size_gb: number
      cost_per_month: number
      percentage: number
    }>
  } | null
  total_savings: number
  timestamp: string
}

export default function AdminSystemHealthPage() {
  const { data, error, isLoading } = useSWR<PerformanceMetrics>(
    '/api/monitoring/performance-metrics',
    { refreshInterval: 60000, revalidateOnFocus: true }
  )

  const { data: costData, error: costError } = useSWR<CostMetrics>(
    '/api/monitoring/cost-metrics',
    { refreshInterval: 300000, revalidateOnFocus: false }
  )

  return (
    <div className="p-6">
      <AdminPageHeader
        title="System Health"
        description="Database performance, storage, and cost metrics"
      />

      {isLoading && (
        <div className="space-y-6">
          <Skeleton className="h-[200px] w-full" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-[150px]" />
            <Skeleton className="h-[150px]" />
            <Skeleton className="h-[150px]" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-[300px]" />
            <Skeleton className="h-[300px]" />
          </div>
        </div>
      )}

      {error && !data && (
        <div className="flex items-center justify-center h-96">
          <div className="border border-destructive/20 bg-destructive/5 rounded-lg p-8 max-w-md">
            <div className="flex items-center gap-3 mb-2">
              <AlertCircle className="w-5 h-5 text-destructive" />
              <p className="text-destructive font-semibold">Failed to load metrics</p>
            </div>
            <p className="text-sm text-muted-foreground">
              {error?.message || 'Could not fetch performance data. Please try again.'}
            </p>
          </div>
        </div>
      )}

      {data && (
        <div className="space-y-8">
          {/* Timestamp header */}
          <div className="flex items-center justify-between border-b pb-4">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-sm text-muted-foreground">
                Last updated:{' '}
                <span className="text-foreground font-medium">
                  {formatDistanceToNow(new Date(data.timestamp), { addSuffix: true })}
                </span>
              </span>
            </div>
          </div>

          <StorageBreakdown storage={data.storage} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SlowQueriesTable queries={data.queries.slow_queries} />
            <TableScanStats stats={data.queries.table_scan_stats} />
          </div>

          {costData && !costError && (
            <CostTrackingDashboard
              currentCosts={costData.current_costs}
              baselineCosts={costData.baseline_costs}
              totalSavings={costData.total_savings}
            />
          )}
        </div>
      )}
    </div>
  )
}
