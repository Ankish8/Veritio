import { getMotiaSupabaseClient } from '../lib/supabase/motia-client'
import { getRedisClient } from '../lib/redis/client'

// Version is set via environment or defaults - can't use package.json import in Motia compiled context
const APP_VERSION = process.env.npm_package_version || '0.1.0'

// Overall timeout for health checks (prevents hanging endpoints)
const HEALTH_CHECK_TIMEOUT_MS = 8000

// Cache health check results to reduce database load
const HEALTH_CHECK_CACHE_MS = 10000 // 10 seconds
let cachedHealthResult: HealthCheckResult | null = null
let cacheTimestamp = 0

export type ServiceStatus = 'up' | 'down'

export interface ServiceHealth {
  status: ServiceStatus
  latency_ms: number
  error?: string
}

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy'
  version: string
  timestamp: string
  services: {
    database: ServiceHealth
    redis: ServiceHealth
  }
}

async function checkDatabase(): Promise<ServiceHealth> {
  const start = performance.now()

  try {
    const supabase = getMotiaSupabaseClient()

    // RPC ping bypasses RLS; falls back to projects table query
    const { error } = await supabase.rpc('ping' as any).single().then(
      (result) => result,
      () => supabase.from('projects').select('id').limit(1)
    )

    const latency = Math.round(performance.now() - start)

    if (error) {
      return {
        status: 'down',
        latency_ms: latency,
        error: error.message,
      }
    }

    return {
      status: 'up',
      latency_ms: latency,
    }
  } catch (err) {
    const latency = Math.round(performance.now() - start)
    return {
      status: 'down',
      latency_ms: latency,
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}

async function checkRedis(): Promise<ServiceHealth> {
  const start = performance.now()

  try {
    const redis = getRedisClient()
    const result = await redis.ping()

    const latency = Math.round(performance.now() - start)

    if (result !== 'PONG') {
      return {
        status: 'down',
        latency_ms: latency,
        error: `Unexpected PING response: ${result}`,
      }
    }

    return {
      status: 'up',
      latency_ms: latency,
    }
  } catch (err) {
    const latency = Math.round(performance.now() - start)
    return {
      status: 'down',
      latency_ms: latency,
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}

export async function checkHealth(): Promise<HealthCheckResult> {
  const now = Date.now()

  if (cachedHealthResult && now - cacheTimestamp < HEALTH_CHECK_CACHE_MS) {
    return cachedHealthResult
  }

  const version = APP_VERSION

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Health check timeout')), HEALTH_CHECK_TIMEOUT_MS)
  })

  try {
    const [database, redis] = await Promise.race([
      Promise.all([checkDatabase(), checkRedis()]),
      timeoutPromise,
    ])

    const allUp = database.status === 'up' && redis.status === 'up'

    const result: HealthCheckResult = {
      status: allUp ? 'healthy' : 'unhealthy',
      version,
      timestamp: new Date().toISOString(),
      services: {
        database,
        redis,
      },
    }

    cachedHealthResult = result
    cacheTimestamp = now

    return result
  } catch (err) {
    // Timeout or unexpected error - return unhealthy
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'

    const result: HealthCheckResult = {
      status: 'unhealthy',
      version,
      timestamp: new Date().toISOString(),
      services: {
        database: {
          status: 'down',
          latency_ms: HEALTH_CHECK_TIMEOUT_MS,
          error: errorMessage,
        },
        redis: {
          status: 'down',
          latency_ms: HEALTH_CHECK_TIMEOUT_MS,
          error: errorMessage,
        },
      },
    }

    return result
  }
}
