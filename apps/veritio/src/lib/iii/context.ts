/**
 * Handler context assembly — the `ctx` object every step handler receives.
 *
 * Reproduces motia rc.26's flowContext surface used by this codebase:
 * { logger, enqueue, streams, state, traceId }.
 */

import type { IIIClient } from 'iii-sdk'
import type { EventHandlerContext } from '../motia/types'
import { createStepLogger } from './logger'
import { createStateManager } from './state'
import { createStreamsProxy } from './streams'

let warnedMessageGroupId = false

/**
 * Extract a trace id from the invocation metadata when the engine provides
 * one; otherwise mint a fresh UUID (rc.26 behavior when no active span).
 */
function resolveTraceId(metadata: unknown): string {
  if (metadata && typeof metadata === 'object') {
    const m = metadata as Record<string, unknown>
    const candidate = m.trace_id ?? m.traceId ?? m.invocation_id ?? m.invocationId
    if (typeof candidate === 'string' && candidate.length > 0) return candidate
  }
  return crypto.randomUUID()
}

export function buildContext(
  client: IIIClient,
  opts: { stepId: string; metadata?: unknown }
): EventHandlerContext {
  const traceId = resolveTraceId(opts.metadata)
  const logger = createStepLogger({ step: opts.stepId, traceId })

  return {
    logger,
    traceId,
    state: createStateManager(client),
    streams: createStreamsProxy(client),

    // rc.26's enqueue was an engine call carrying {topic, data, messageGroupId}.
    // 0.21 renamed the durable publish function; FIFO grouping moved to
    // subscriber-side queue_config (see register-step.ts), so messageGroupId
    // is dropped here — the one FIFO consumer (study-continues →
    // update-study-analytics) declares message_group_field: studyId instead.
    async enqueue(event: { topic: string; data: Record<string, unknown>; messageGroupId?: string }): Promise<void> {
      if (event.messageGroupId && !warnedMessageGroupId) {
        warnedMessageGroupId = true
        logger.warn(
          'enqueue({ messageGroupId }) is superseded by subscriber-side queue_config.message_group_field; the field is ignored at publish time',
          { topic: event.topic }
        )
      }
      await client.trigger({
        function_id: 'iii::durable::publish',
        payload: { topic: event.topic, data: event.data },
      })
    },
  }
}
