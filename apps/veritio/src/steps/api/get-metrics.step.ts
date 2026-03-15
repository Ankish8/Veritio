import type { StepConfig } from 'motia'
import { getCurrentMetrics } from '../../lib/monitoring/local-metrics'
import { cache } from '../../lib/cache/memory-cache'

export const config = {
  name: 'GetMetrics',
  description: 'Get current server metrics (dev only)',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/metrics',
  }],
  enqueues: [],
} satisfies StepConfig

export const handler = async () => {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return {
      status: 404,
      body: { error: 'Not found' },
    }
  }

  const metrics = getCurrentMetrics()
  const cacheStats = cache.stats()

  return {
    status: 200,
    body: {
      ...metrics,
      cache: {
        size: cacheStats.size,
        maxSize: cacheStats.maxSize,
        keys: cacheStats.keys.slice(0, 20), // First 20 keys only
      },
    },
  }
}
