/**
 * Type definitions for Motia step handlers
 * Eliminates "as any" casts for logger, enqueue, and context objects
 */

/** Logger interface used across all Motia steps */
export interface MotiaLogger {
  info: (message: string, meta?: Record<string, unknown>) => void
  warn: (message: string, meta?: Record<string, unknown>) => void
  error: (message: string, meta?: Record<string, unknown>) => void
  debug?: (message: string, meta?: Record<string, unknown>) => void
}

/** Event enqueue function type */
export type EnqueueFunction = (event: {
  topic: string
  data: Record<string, unknown>
  messageGroupId?: string
}) => Promise<void>

/** @deprecated Use EnqueueFunction instead */
export type EmitFunction = EnqueueFunction

/** Ephemeral stream send channel */
export interface StreamEventChannel {
  groupId: string
  id?: string
}

/** Ephemeral stream event */
export interface StreamEvent<TData = unknown> {
  type: string
  data: TData
}

/** A single named stream with get/set/send methods */
export interface MotiaStreamInstance {
  get<T = unknown>(groupId: string, id: string): Promise<T | null>
  set<T = unknown>(groupId: string, id: string, data: T): Promise<unknown>
  update(groupId: string, id: string, ops: UpdateOp[]): Promise<unknown>
  delete(groupId: string, id: string): Promise<unknown>
  getGroup(groupId: string): Promise<unknown[]>
  send<T>(channel: StreamEventChannel, event: StreamEvent<T>): Promise<void>
}

/** Update operation for atomic state/stream updates */
export type UpdateOp =
  | { type: 'set'; path: string; value: unknown }
  | { type: 'increment'; path: string; by: number }
  | { type: 'decrement'; path: string; by: number }
  | { type: 'remove'; path: string }
  | { type: 'merge'; path: string; value: unknown }

/** State manager for cross-step ephemeral storage */
export interface MotiaStateManager {
  get<T = unknown>(groupId: string, key: string): Promise<T | null>
  set<T = unknown>(groupId: string, key: string, value: T): Promise<{ new_value: T; old_value: T | null }>
  delete<T = unknown>(groupId: string, key: string): Promise<T | null>
  update(groupId: string, key: string, ops: UpdateOp[]): Promise<unknown>
  list(groupId: string, options?: { cursor?: string; limit?: number }): Promise<{ items: Array<{ key: string; value: unknown }>; cursor?: string }>
  getGroup(groupId: string): Promise<Record<string, unknown>>
  clear(groupId: string): Promise<void>
}

/** Context object for API route handlers */
export interface ApiHandlerContext {
  logger: MotiaLogger
  enqueue: EnqueueFunction
  streams: Record<string, MotiaStreamInstance>
  state: MotiaStateManager
}

/** Context object for event handlers (includes additional properties) */
export interface EventHandlerContext extends ApiHandlerContext {
  traceId?: string
}

/** API request object type (matches Motia's runtime structure) */
export interface ApiRequest<
  TBody = unknown,
  TPathParams = Record<string, string>,
  TQueryParams = Record<string, unknown>
> {
  body: TBody
  pathParams: TPathParams
  queryParams: TQueryParams
  headers: Record<string, string | string[] | undefined>
}
