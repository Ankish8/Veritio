/**
 * Trace context propagation using AsyncLocalStorage.
 * Enables automatic traceId propagation through async calls.
 */

import { AsyncLocalStorage } from 'async_hooks'
import { randomUUID } from 'crypto'

export interface TraceContext {
  traceId: string
  spanId: string
  parentSpanId?: string
  startTime: number
  attributes: Record<string, unknown>
}

// AsyncLocalStorage for context propagation across async boundaries
const traceStore = new AsyncLocalStorage<TraceContext>()

/**
 * Generate a unique trace ID (UUID v4)
 */
export function generateTraceId(): string {
  return randomUUID()
}

/**
 * Generate a unique span ID (8 hex characters)
 */
export function generateSpanId(): string {
  return Math.random().toString(16).substring(2, 10)
}

/**
 * Get the current trace context from AsyncLocalStorage
 */
export function getTraceContext(): TraceContext | undefined {
  return traceStore.getStore()
}

/**
 * Get the current trace ID, or undefined if not in a trace context
 */
export function getTraceId(): string | undefined {
  return traceStore.getStore()?.traceId
}

/**
 * Run a function within a trace context.
 * Creates a new context if one doesn't exist.
 */
export function runWithTraceContext<T>(
  context: Partial<TraceContext>,
  fn: () => T
): T {
  const fullContext: TraceContext = {
    traceId: context.traceId || generateTraceId(),
    spanId: context.spanId || generateSpanId(),
    parentSpanId: context.parentSpanId,
    startTime: context.startTime || Date.now(),
    attributes: context.attributes || {},
  }

  return traceStore.run(fullContext, fn)
}

/**
 * Start a new span within the current trace context.
 * Returns a function to end the span.
 */
export function startSpan(name: string, attributes?: Record<string, unknown>): () => void {
  const parentContext = getTraceContext()
  const spanId = generateSpanId()

  const spanContext: TraceContext = {
    traceId: parentContext?.traceId || generateTraceId(),
    spanId,
    parentSpanId: parentContext?.spanId,
    startTime: Date.now(),
    attributes: {
      'span.name': name,
      ...attributes,
    },
  }

  // Update the store with the new span
  const store = traceStore.getStore()
  if (store) {
    store.spanId = spanId
    store.parentSpanId = parentContext?.spanId
    store.attributes = {
      ...store.attributes,
      ...spanContext.attributes,
    }
  }

  return () => {
    // End span - could emit metrics here
    const _duration = Date.now() - spanContext.startTime
    // Future: emit span completion event for observability
  }
}

/**
 * Add attributes to the current trace context
 */
export function setTraceAttribute(key: string, value: unknown): void {
  const context = getTraceContext()
  if (context) {
    context.attributes[key] = value
  }
}

/**
 * Add multiple attributes to the current trace context
 */
export function setTraceAttributes(attributes: Record<string, unknown>): void {
  const context = getTraceContext()
  if (context) {
    Object.assign(context.attributes, attributes)
  }
}
