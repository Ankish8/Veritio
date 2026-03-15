/**
 * Observability system exports.
 */

export {
  generateTraceId,
  generateSpanId,
  getTraceContext,
  getTraceId,
  runWithTraceContext,
  startSpan,
  setTraceAttribute,
  setTraceAttributes,
} from './trace-context'

export type { TraceContext } from './trace-context'

export {
  createEnhancedLogger,
  createChildLogger,
} from './enhanced-logger'

export type { LogContext, EnhancedLogger } from './enhanced-logger'

export { metrics } from './metrics'
