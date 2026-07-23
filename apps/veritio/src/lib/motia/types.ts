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

// ============================================================================
// Step & stream configuration types
//
// Local replacements for the wound-down `motia` npm package — structural
// supersets of motia 1.0.0-rc.26's shapes so every existing
// `satisfies StepConfig` keeps compiling unchanged. Consumed at runtime by
// the iii adapter (src/lib/iii/), which registers each step's triggers with
// the iii engine.
// ============================================================================

/** HTTP response returned by step handlers and middleware */
export type ApiResponse<TStatus extends number = number, TBody = any> = {
  status: TStatus
  headers?: Record<string, string>
  body: TBody
}

/**
 * Middleware chain contract: (req, ctx, next). May short-circuit by returning
 * a response without calling next(), and may mutate req (e.g. authMiddleware
 * injects `x-user-id` into req.headers). Composed in-process by the iii
 * adapter — execution order and mutation semantics match motia rc.26 exactly.
 * (Second generic kept for compatibility with existing `ApiMiddleware<A,B,C>`
 * annotations; it carried motia's FlowContext enqueue typing.)
 */
export type ApiMiddleware<TBody = unknown, _TEnqueueData = never, TResult = unknown> = (
  req: ApiRequest<TBody>,
  ctx: EventHandlerContext,
  next: () => Promise<ApiResponse<number, TResult>>
) => Promise<ApiResponse<number, TResult>>

export interface QueryParam {
  name: string
  description: string
}

export interface HandlerInfraConfig {
  ram?: number
  cpu?: number
  timeout?: number
}

export interface QueueInfraConfig {
  type?: 'fifo' | 'standard'
  maxRetries?: number
  visibilityTimeout?: number
  delaySeconds?: number
  /**
   * iii extension: name of a field inside the message data used for FIFO
   * grouping (replaces motia's per-publish messageGroupId, which the iii
   * queue expresses as subscriber-side config).
   */
  messageGroupField?: string
}

export interface InfrastructureConfig {
  handler?: HandlerInfraConfig
  queue?: QueueInfraConfig
}

export type ApiRouteMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS' | 'HEAD'

export interface HttpTrigger {
  type: 'http'
  path: string
  method: ApiRouteMethod
  /** Zod schema — documentation/typegen only, not enforced at runtime (parity with rc.26) */
  bodySchema?: unknown
  responseSchema?: Record<number, unknown>
  queryParams?: readonly QueryParam[]
  middleware?: readonly ApiMiddleware<any, any, any>[]
}

export interface QueueTrigger {
  type: 'queue'
  topic: string
  /** Zod schema — documentation only, not enforced at runtime (parity with rc.26) */
  input?: unknown
  infrastructure?: InfrastructureConfig
}

export interface CronTrigger {
  type: 'cron'
  /** 7-field cron expression: sec min hour dom mon dow year */
  expression: string
  input?: never
}

export type TriggerConfig = HttpTrigger | QueueTrigger | CronTrigger

export type Enqueue = string | { topic: string; label?: string; conditional?: boolean }

/** Step configuration exported by every *.step.ts file */
export interface StepConfig {
  name: string
  description?: string
  triggers: readonly TriggerConfig[]
  enqueues?: readonly Enqueue[]
  /** Observability-only labels (e.g. external API calls) — never queue topics */
  virtualEnqueues?: readonly Enqueue[]
  virtualSubscribes?: readonly string[]
  /** Metadata tags for grouping related steps */
  flows?: readonly string[]
  includeFiles?: readonly string[]
}

// ---------------------------------------------------------------------------
// Streams
// ---------------------------------------------------------------------------

export interface StreamSubscription {
  groupId: string
  id?: string
}

export interface StreamJoinResult {
  unauthorized?: boolean
}

/** Context returned by the stream auth function; empty for anonymous clients */
export interface StreamAuthContext {
  userId?: string
  [key: string]: unknown
}

/** Stream definition exported by *.stream.ts files */
export interface StreamConfig {
  name: string
  /** Zod schema — documentation only */
  schema: unknown
  baseConfig: { storageType: 'default' }
  onJoin?: (
    subscription: StreamSubscription,
    context: EventHandlerContext,
    authContext?: StreamAuthContext
  ) => Promise<StreamJoinResult | void> | StreamJoinResult | void
  onLeave?: (
    subscription: StreamSubscription,
    context: EventHandlerContext,
    authContext?: StreamAuthContext
  ) => Promise<void> | void
}
