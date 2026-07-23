/**
 * Step registrar — the adapter's heart.
 *
 * Takes a Motia-style step module ({ config, handler }) and registers it with
 * the iii engine: one function per step file (IDs derive from the file path,
 * e.g. `steps::api/health`, because config.name is not unique), plus one
 * trigger per config.triggers[] entry.
 *
 * Wrapper behavior reproduces motia rc.26's runtime exactly
 * (request/response mapping, middleware composition, undefined → 200/null),
 * with rc.26's engine calls translated to their current iii names
 * (queue trigger type `queue` → `durable:subscriber`).
 */

import type { IIIClient } from 'iii-sdk'
import type {
  ApiResponse,
  CronTrigger,
  HttpTrigger,
  QueueTrigger,
  StepConfig,
  TriggerConfig,
} from '../motia/types'
import { buildContext } from './context'
import { composeMiddleware } from './middleware'

export interface StepModule {
  config: StepConfig
  handler: (...args: any[]) => any
}

interface IIIHttpRequest {
  path?: string
  method?: string
  path_params?: Record<string, string>
  query_params?: Record<string, string | string[]>
  body?: unknown
  headers?: Record<string, string | string[]>
  [key: string]: unknown
}

let warnedInfraKeys = false

function registrationError(stepId: string, message: string): Error {
  return new Error(`[register-step] ${stepId}: ${message}`)
}

function assertHomogeneousTriggers(stepId: string, triggers: readonly TriggerConfig[]): TriggerConfig['type'] {
  if (triggers.length === 0) throw registrationError(stepId, 'step declares no triggers')
  const kinds = new Set(triggers.map((t) => t.type))
  if (kinds.size > 1) {
    // No step mixes kinds today; the per-kind wrapper below relies on that.
    throw registrationError(stepId, `mixed trigger kinds not supported: ${[...kinds].join(', ')}`)
  }
  return triggers[0].type
}

function toQueueConfig(stepId: string, trigger: QueueTrigger): Record<string, unknown> | undefined {
  const infra = trigger.infrastructure?.queue
  if (!infra) return undefined
  const queueConfig: Record<string, unknown> = {}
  if (infra.maxRetries !== undefined) queueConfig.max_retries = infra.maxRetries
  if (infra.type !== undefined) queueConfig.type = infra.type
  if (infra.messageGroupField !== undefined) queueConfig.message_group_field = infra.messageGroupField
  if ((infra.visibilityTimeout !== undefined || infra.delaySeconds !== undefined) && !warnedInfraKeys) {
    warnedInfraKeys = true
    console.warn(
      `[register-step] ${stepId}: infrastructure.queue.visibilityTimeout/delaySeconds have no iii equivalent and are ignored`
    )
  }
  return Object.keys(queueConfig).length > 0 ? queueConfig : undefined
}

function registerHttpStep(client: IIIClient, stepId: string, mod: StepModule, trigger: HttpTrigger): void {
  if (!trigger.path || !trigger.method) throw registrationError(stepId, 'http trigger requires path and method')

  client.registerFunction(
    stepId,
    async (req: IIIHttpRequest, metadata?: unknown) => {
      // Exact rc.26 request mapping, plus additive `path`/`method` (the
      // observability middleware reads them off the request object).
      const motiaRequest = {
        pathParams: req.path_params || {},
        queryParams: req.query_params || {},
        body: req.body,
        headers: req.headers || {},
        path: req.path ?? trigger.path,
        method: req.method ?? trigger.method,
      }
      const ctx = buildContext(client, { stepId, metadata })
      const middlewares = Array.isArray(trigger.middleware) ? trigger.middleware : []
      const handlerFn = async (): Promise<ApiResponse> => {
        return (await mod.handler(motiaRequest, ctx)) || { status: 200, body: null }
      }
      try {
        const response = await composeMiddleware(...middlewares)(motiaRequest, ctx, handlerFn)
        return {
          status_code: response.status,
          headers: response.headers,
          body: response.body,
        }
      } catch (error) {
        // Parity with engine 0.7: an uncaught handler/middleware exception
        // becomes an OPAQUE 500. Letting it propagate would return iii's
        // invocation_failed envelope, which leaks the raw error message
        // (e.g. zod issues) on routes lacking errorHandlerMiddleware.
        const errorId = crypto.randomUUID()
        ctx.logger.error('Unhandled step error', {
          errorId,
          error: error instanceof Error ? error.message : String(error),
        })
        return {
          status_code: 500,
          body: { error: 'internal server error', error_id: errorId },
        }
      }
    },
    { description: mod.config.description, metadata: { step: stepId, name: mod.config.name } }
  )

  client.registerTrigger({
    type: 'http',
    function_id: stepId,
    // rc.26 stripped the leading slash for this engine family; 0.22 keeps
    // the convention (verified against /api/health in local boot).
    config: {
      api_path: trigger.path.startsWith('/') ? trigger.path.substring(1) : trigger.path,
      http_method: trigger.method,
    },
    metadata: { step: stepId },
  })
}

function registerQueueStep(client: IIIClient, stepId: string, mod: StepModule, triggers: readonly QueueTrigger[]): void {
  client.registerFunction(
    stepId,
    async (data: unknown, metadata?: unknown) => {
      // durable:subscriber delivers the published `data` unwrapped — same as
      // rc.26's queue trigger handing the message straight to the handler.
      const ctx = buildContext(client, { stepId, metadata })
      return mod.handler(data, ctx)
    },
    { description: mod.config.description, metadata: { step: stepId, name: mod.config.name } }
  )

  for (const trigger of triggers) {
    if (!trigger.topic) throw registrationError(stepId, 'queue trigger requires topic')
    const queue_config = toQueueConfig(stepId, trigger)
    client.registerTrigger({
      type: 'durable:subscriber',
      function_id: stepId,
      config: queue_config ? { topic: trigger.topic, queue_config } : { topic: trigger.topic },
      metadata: { step: stepId },
    })
  }
}

function registerCronStep(client: IIIClient, stepId: string, mod: StepModule, triggers: readonly CronTrigger[]): void {
  client.registerFunction(
    stepId,
    async (_input: unknown, metadata?: unknown) => {
      const ctx = buildContext(client, { stepId, metadata })
      return mod.handler(undefined, ctx)
    },
    { description: mod.config.description, metadata: { step: stepId, name: mod.config.name } }
  )

  for (const trigger of triggers) {
    if (!trigger.expression) throw registrationError(stepId, 'cron trigger requires expression')
    client.registerTrigger({
      type: 'cron',
      function_id: stepId,
      config: { expression: trigger.expression },
      metadata: { step: stepId },
    })
  }
}

/** Registered-trigger tally, used by main.ts for the boot manifest log. */
export interface RegistrationCounts {
  http: number
  queue: number
  cron: number
}

export function registerStep(client: IIIClient, stepId: string, mod: StepModule): RegistrationCounts {
  const { config } = mod
  if (!config || typeof mod.handler !== 'function') {
    throw registrationError(stepId, 'module must export config and handler')
  }

  const kind = assertHomogeneousTriggers(stepId, config.triggers)
  const counts: RegistrationCounts = { http: 0, queue: 0, cron: 0 }

  switch (kind) {
    case 'http': {
      const triggers = config.triggers as readonly HttpTrigger[]
      if (triggers.length > 1) throw registrationError(stepId, 'multiple http triggers on one step are not supported')
      registerHttpStep(client, stepId, mod, triggers[0])
      counts.http = 1
      break
    }
    case 'queue': {
      const triggers = config.triggers as readonly QueueTrigger[]
      registerQueueStep(client, stepId, mod, triggers)
      counts.queue = triggers.length
      break
    }
    case 'cron': {
      const triggers = config.triggers as readonly CronTrigger[]
      registerCronStep(client, stepId, mod, triggers)
      counts.cron = triggers.length
      break
    }
    default:
      throw registrationError(stepId, `unknown trigger type: ${String(kind)}`)
  }

  return counts
}
