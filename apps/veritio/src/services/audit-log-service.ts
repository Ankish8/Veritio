import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@veritio/study-types'

type SupabaseClientType = SupabaseClient<Database>

interface Logger {
  info: (message: string, meta?: Record<string, unknown>) => void
  warn: (message: string, meta?: Record<string, unknown>) => void
  error: (message: string, meta?: Record<string, unknown>) => void
}

// ============================================================================
// WRITE AUDIT LOG
// ============================================================================

interface AuditLogEntry {
  userId: string
  action: string
  resourceType?: string
  resourceId?: string
  metadata?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
}

export async function writeAuditLog(
  supabase: SupabaseClientType,
  entry: AuditLogEntry,
  logger?: Logger
) {
  const { error } = await (supabase as any)
    .from('audit_log')
    .insert({
      user_id: entry.userId,
      action: entry.action,
      resource_type: entry.resourceType ?? null,
      resource_id: entry.resourceId ?? null,
      metadata: entry.metadata ?? null,
      ip_address: entry.ipAddress ?? null,
      user_agent: entry.userAgent ?? null,
    })

  if (error) {
    logger?.error('Failed to write audit log', { error: error.message, action: entry.action })
    throw new Error('Failed to write audit log')
  }
}

// ============================================================================
// LIST AUDIT LOGS
// ============================================================================

interface AuditLogFilters {
  page: number
  limit: number
  action?: string
  resourceType?: string
  dateFrom?: string
  dateTo?: string
}

export async function listAuditLogs(
  supabase: SupabaseClientType,
  filters: AuditLogFilters,
  logger?: Logger
) {
  const from = filters.page * filters.limit
  const to = from + filters.limit - 1

  let query = (supabase as any)
    .from('audit_log')
    .select('*, user:user_id(id, name, email)', { count: 'exact' })
    .order('created_at', { ascending: false })

  if (filters.action) {
    query = query.eq('action', filters.action)
  }
  if (filters.resourceType) {
    query = query.eq('resource_type', filters.resourceType)
  }
  if (filters.dateFrom) {
    query = query.gte('created_at', filters.dateFrom)
  }
  if (filters.dateTo) {
    query = query.lte('created_at', filters.dateTo)
  }

  const { data: logs, count, error } = await query.range(from, to)

  if (error) {
    logger?.error('Failed to list audit logs', { error: error.message })
    throw new Error('Failed to list audit logs')
  }

  return { logs: logs ?? [], total: count ?? 0 }
}
