import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

const DEFAULT_SLOW_QUERY_THRESHOLD_MS = 500

type SlowQueryLogger = {
  warn: (message: string, meta?: Record<string, unknown>) => void
}

const defaultLogger: SlowQueryLogger = {
  warn: () => {
    // Slow query logging disabled
  },
}

interface MotiaSupabaseClientOptions {
  logger?: SlowQueryLogger
  /** Override slow query threshold (ms). Use higher values for background jobs hitting partitioned tables. */
  slowQueryThresholdMs?: number
}

/**
 * Stateless Supabase client for Motia steps.
 * Uses service role key for server-side operations.
 * No cookie dependency - works outside of Next.js context.
 *
 * Optimizations:
 * - Singleton pattern for connection reuse
 * - Keep-alive enabled for HTTP connections
 * - Disabled auth overhead (service role doesn't need token refresh)
 */
export function createMotiaSupabaseClient(options?: MotiaSupabaseClientOptions) {
  const logger = options?.logger ?? defaultLogger
  const slowQueryThresholdMs = options?.slowQueryThresholdMs ?? DEFAULT_SLOW_QUERY_THRESHOLD_MS
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set')
  }

  if (!supabaseServiceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set')
  }

  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        'Connection': 'keep-alive',
      },
      fetch: async (url, options) => {
        const start = Date.now()
        const response = await fetch(url, options)
        const duration = Date.now() - start

        if (duration > slowQueryThresholdMs) {
          const urlString = typeof url === 'string' ? url : url.toString()
          logger.warn('[Supabase] Slow query detected', {
            url: urlString,
            duration,
            status: response.status,
          })
        }

        return response
      },
    },
  })
}

// Singleton instance for reuse across requests
let supabaseClient: ReturnType<typeof createMotiaSupabaseClient> | null = null

/**
 * Get a shared Supabase client instance.
 * Creates a new client on first call, reuses on subsequent calls.
 * Uses default 500ms threshold — for custom thresholds, use createMotiaSupabaseClient() directly.
 */
export function getMotiaSupabaseClient() {
  if (!supabaseClient) {
    supabaseClient = createMotiaSupabaseClient()
  }
  return supabaseClient
}
