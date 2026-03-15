/**
 * Enhanced logger with automatic trace context injection.
 * Wraps the existing MotiaLogger to add trace IDs and structured context.
 */

import type { MotiaLogger } from '../motia/types'
import { getTraceId } from './trace-context'

export interface LogContext {
  traceId?: string
  userId?: string
  studyId?: string
  projectId?: string
  resourceType?: string
  action?: string
  [key: string]: unknown
}

/**
 * Enhanced logger interface with context methods.
 */
export interface EnhancedLogger extends MotiaLogger {
  withContext(ctx: LogContext): EnhancedLogger
  withTraceId(traceId: string): EnhancedLogger
  withUser(userId: string): EnhancedLogger
  withStudy(studyId: string): EnhancedLogger
}

/**
 * Create an enhanced logger that automatically includes trace context.
 */
export function createEnhancedLogger(
  baseLogger: MotiaLogger,
  initialContext: LogContext = {}
): EnhancedLogger {
  // Merge initial context with trace context if available
  const context: LogContext = {
    ...initialContext,
  }

  // Auto-inject trace ID if available
  const traceId = getTraceId()
  if (traceId && !context.traceId) {
    context.traceId = traceId
  }

  // Helper to merge metadata with context
  const mergeMetadata = (meta?: Record<string, unknown>): Record<string, unknown> => {
    return {
      ...context,
      ...meta,
    }
  }

  const enhancedLogger: EnhancedLogger = {
    info: (message: string, meta?: Record<string, unknown>) => {
      baseLogger.info(message, mergeMetadata(meta))
    },

    warn: (message: string, meta?: Record<string, unknown>) => {
      baseLogger.warn(message, mergeMetadata(meta))
    },

    error: (message: string, meta?: Record<string, unknown>) => {
      baseLogger.error(message, mergeMetadata(meta))
    },

    debug: baseLogger.debug
      ? (message: string, meta?: Record<string, unknown>) => {
          baseLogger.debug!(message, mergeMetadata(meta))
        }
      : undefined,

    withContext: (ctx: LogContext): EnhancedLogger => {
      return createEnhancedLogger(baseLogger, { ...context, ...ctx })
    },

    withTraceId: (traceId: string): EnhancedLogger => {
      return createEnhancedLogger(baseLogger, { ...context, traceId })
    },

    withUser: (userId: string): EnhancedLogger => {
      return createEnhancedLogger(baseLogger, { ...context, userId })
    },

    withStudy: (studyId: string): EnhancedLogger => {
      return createEnhancedLogger(baseLogger, { ...context, studyId })
    },
  }

  return enhancedLogger
}

/**
 * Create a child logger with additional context.
 * Useful for service-specific logging.
 */
export function createChildLogger(
  parentLogger: EnhancedLogger,
  context: LogContext
): EnhancedLogger {
  return parentLogger.withContext(context)
}
