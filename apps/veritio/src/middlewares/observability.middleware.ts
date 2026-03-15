/**
 * Observability middleware for Motia API endpoints.
 * Handles trace context propagation and metrics collection.
 */

import { generateTraceId, runWithTraceContext } from '../lib/observability/trace-context'
import { createEnhancedLogger } from '../lib/observability/enhanced-logger'
import { metrics } from '../lib/observability/metrics'

/**
 * Observability middleware - should be first in the middleware chain.
 * Sets up trace context, enhanced logging, and metrics collection.
 */
export async function observabilityMiddleware(
  req: any,
  ctx: any,
  next: () => Promise<any>
) {
  // Generate or use existing trace ID
  const traceId = ctx.traceId || generateTraceId()
  const startTime = Date.now()

  // Create enhanced logger with trace context
  const enhancedLogger = createEnhancedLogger(ctx.logger, {
    traceId,
    path: req.path,
    method: req.method,
    userId: req.headers['x-user-id'],
  })

  // Replace context logger with enhanced version
  ctx.logger = enhancedLogger
  ctx.traceId = traceId

  // Run handler within trace context
  return runWithTraceContext(
    {
      traceId,
      startTime,
      attributes: {
        'http.method': req.method,
        'http.path': req.path,
        'http.user_id': req.headers['x-user-id'],
      },
    },
    async () => {
      try {
        const result = await next()

        // Record successful request metrics
        const duration = Date.now() - startTime
        const endpoint = req.path || 'unknown'
        const status = result?.status || 200

        metrics.recordRequest(endpoint, req.method, status, duration)

        // Add trace ID to response headers if not already set
        if (result && typeof result === 'object') {
          if (!result.headers) {
            result.headers = {}
          }
          result.headers['X-Trace-Id'] = traceId
        }

        return result
      } catch (error) {
        // Record error metrics
        const duration = Date.now() - startTime
        const endpoint = req.path || 'unknown'
        const errorCode = error instanceof Error ? error.name : 'UnknownError'

        metrics.recordRequest(endpoint, req.method, 500, duration)
        metrics.recordError(endpoint, req.method, errorCode)

        // Re-throw error to be handled by error middleware
        throw error
      }
    }
  )
}
