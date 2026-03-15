import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@veritio/study-types'

type SupabaseClientType = SupabaseClient<Database>

export interface StorageMetrics {
  total_size_bytes: number
  recordings_size_bytes: number
  yjs_documents_size_bytes: number
  chunk_etags_size_bytes: number
  largest_tables: Array<{ table_name: string; size_bytes: number }>
}

export interface QueryPerformanceMetrics {
  slow_queries: Array<{ query: string; avg_duration_ms: number; call_count: number }>
  table_scan_stats: Array<{
    table_name: string
    seq_scan_count: number
    idx_scan_count: number
    ratio: number | null
  }>
}

const toNumber = (value: unknown): number => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function normalizeStorageMetrics(data: any): StorageMetrics {
  return {
    total_size_bytes: toNumber(data?.total_size_bytes),
    recordings_size_bytes: toNumber(data?.recordings_size_bytes),
    yjs_documents_size_bytes: toNumber(data?.yjs_documents_size_bytes),
    chunk_etags_size_bytes: toNumber(data?.chunk_etags_size_bytes),
    largest_tables: Array.isArray(data?.largest_tables)
      ? data.largest_tables.map((row: any) => ({
        table_name: String(row?.table_name ?? ''),
        size_bytes: toNumber(row?.size_bytes),
      }))
      : [],
  }
}

function normalizeQueryPerformanceMetrics(data: any): QueryPerformanceMetrics {
  return {
    slow_queries: Array.isArray(data?.slow_queries)
      ? data.slow_queries.map((row: any) => ({
        query: String(row?.query ?? ''),
        avg_duration_ms: toNumber(row?.avg_duration_ms),
        call_count: toNumber(row?.call_count),
      }))
      : [],
    table_scan_stats: Array.isArray(data?.table_scan_stats)
      ? data.table_scan_stats.map((row: any) => ({
        table_name: String(row?.table_name ?? ''),
        seq_scan_count: toNumber(row?.seq_scan_count),
        idx_scan_count: toNumber(row?.idx_scan_count),
        ratio: row?.ratio === null || row?.ratio === undefined ? null : toNumber(row.ratio),
      }))
      : [],
  }
}

export async function getStorageMetrics(supabase: SupabaseClientType): Promise<StorageMetrics> {
  const { data, error } = await (supabase.rpc as any)('get_storage_metrics')

  if (error) {
    throw new Error(error.message)
  }

  if (!data) {
    throw new Error('Storage metrics not available')
  }

  return normalizeStorageMetrics(data)
}

export async function getQueryPerformanceMetrics(
  supabase: SupabaseClientType
): Promise<QueryPerformanceMetrics> {
  const { data, error } = await (supabase.rpc as any)('get_query_performance_metrics')

  if (error) {
    throw new Error(error.message)
  }

  if (!data) {
    throw new Error('Query performance metrics not available')
  }

  return normalizeQueryPerformanceMetrics(data)
}
