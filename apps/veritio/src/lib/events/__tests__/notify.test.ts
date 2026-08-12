/**
 * The notification payload contract.
 *
 * Four emitters independently shipped malformed payloads — a nested `data:`,
 * a top-level `urgent`, a top-level `projectId` — because the consumer's Zod
 * schema stripped unknown keys silently. These tests pin the two halves that
 * now prevent it: `buildNotificationEvent` produces only the accepted shape,
 * and the consumer's strict schema rejects anything else.
 */
import { describe, it, expect, vi } from 'vitest'
import { z } from 'zod'
import {
  buildNotificationEvent,
  notify,
  NOTIFICATION_CATEGORY,
  stripEngineEnvelope,
  type NotificationType,
} from '../notify'

/** Mirrors the `.strict()` schema in steps/events/send-notification.step.ts. */
const consumerSchema = z
  .object({
    userId: z.string().min(1),
    type: z.string(),
    title: z.string(),
    message: z.string(),
    category: z.string().optional(),
    studyId: z.string().uuid().optional(),
    originalStudyId: z.string().uuid().optional(),
    metadata: z.record(z.unknown()).optional(),
  })
  .strict()

const STUDY = '3f5b2c10-0000-4000-8000-abcdef123456'

describe('buildNotificationEvent', () => {
  it('produces a payload the consumer accepts', () => {
    const event = buildNotificationEvent({
      userId: 'u1',
      type: 'export-completed',
      title: 'Export completed',
      message: 'Ready',
      studyId: STUDY,
      metadata: { jobId: 'j1' },
    })

    expect(event.topic).toBe('notification')
    expect(consumerSchema.safeParse(event.data).success).toBe(true)
  })

  it('routes extras into metadata, never to the top level', () => {
    const event = buildNotificationEvent({
      userId: 'u1',
      type: 'project-created',
      title: 'Project Created',
      message: 'Done',
      metadata: { projectId: 'p1' },
    })

    // The exact bug: projectId at the top level was silently dropped.
    expect(event.data).not.toHaveProperty('projectId')
    expect(event.data.metadata).toEqual({ projectId: 'p1' })
  })

  it('never emits a nested data key', () => {
    const event = buildNotificationEvent({
      userId: 'u1',
      type: 'export-failed',
      title: 'Export failed',
      message: 'Boom',
      metadata: { jobId: 'j1' },
    })

    // The export service used to nest a second `data:` inside `data`.
    expect(event.data).not.toHaveProperty('data')
  })

  it('omits optional keys entirely rather than sending undefined', () => {
    const event = buildNotificationEvent({
      userId: 'u1',
      type: 'workspace-ready',
      title: 'Welcome',
      message: 'Ready',
    })

    expect(event.data).not.toHaveProperty('studyId')
    expect(event.data).not.toHaveProperty('metadata')
    expect(consumerSchema.safeParse(event.data).success).toBe(true)
  })

  it('stamps the category derived from the type', () => {
    expect(
      buildNotificationEvent({
        userId: 'u1',
        type: 'comment-mention',
        title: 't',
        message: 'm',
      }).data.category
    ).toBe('mention')

    expect(
      buildNotificationEvent({
        userId: 'u1',
        type: 'export-completed',
        title: 't',
        message: 'm',
      }).data.category
    ).toBe('job')
  })
})

describe('consumer strict schema', () => {
  it('rejects a top-level extra key instead of silently dropping it', () => {
    const bad = { userId: 'u1', type: 'x', title: 't', message: 'm', urgent: true }
    expect(consumerSchema.safeParse(bad).success).toBe(false)
  })

  it('rejects the nested-data shape the export service used to send', () => {
    const bad = {
      userId: 'u1',
      type: 'x',
      title: 't',
      message: 'm',
      data: { jobId: 'j1' },
    }
    expect(consumerSchema.safeParse(bad).success).toBe(false)
  })

  it('rejects an empty userId, which produced rows owned by nobody', () => {
    expect(
      consumerSchema.safeParse({ userId: '', type: 'x', title: 't', message: 'm' }).success
    ).toBe(false)
  })
})

describe('NOTIFICATION_CATEGORY', () => {
  it('assigns every type a category', () => {
    const types = Object.keys(NOTIFICATION_CATEGORY) as NotificationType[]
    expect(types.length).toBeGreaterThan(0)
    for (const type of types) {
      expect(NOTIFICATION_CATEGORY[type], `${type} has no category`).toBeTruthy()
    }
  })

  it('every category has a filter chip in the inbox', () => {
    // A category present here but missing from NotificationsPanel's FILTERS
    // lands notifications that can only be found under "All". Billing was
    // exactly that, briefly.
    const PANEL_FILTERS = ['mention', 'study', 'job', 'billing', 'system']
    const used = new Set(Object.values(NOTIFICATION_CATEGORY))
    for (const category of used) {
      expect(PANEL_FILTERS, `category "${category}" has no filter chip`).toContain(category)
    }
  })

  it('uses kebab-case throughout — the export types were the snake_case outliers', () => {
    for (const type of Object.keys(NOTIFICATION_CATEGORY)) {
      expect(type, `${type} should be kebab-case`).not.toContain('_')
    }
  })
})

describe('notify', () => {
  it('enqueues the built event', async () => {
    const enqueue = vi.fn().mockResolvedValue(undefined)

    await notify(enqueue, {
      userId: 'u1',
      type: 'analysis-complete',
      title: 'Analysis ready',
      message: 'Done',
      studyId: STUDY,
    })

    expect(enqueue).toHaveBeenCalledTimes(1)
    expect(enqueue.mock.calls[0][0].topic).toBe('notification')
  })

  it('never throws — a failed notification must not fail its caller', async () => {
    const enqueue = vi.fn().mockRejectedValue(new Error('queue down'))

    // An export that succeeded must not be reported as failed because its
    // "done" message could not be enqueued.
    await expect(
      notify(enqueue, { userId: 'u1', type: 'export-completed', title: 't', message: 'm' })
    ).resolves.toBeUndefined()
  })
})

describe('stripEngineEnvelope', () => {
  it('removes the engine field that broke every notification', () => {
    // The iii engine injects _caller_worker_id into every queue message.
    // Parsing strictly without stripping it sent 11 messages to the DLQ before
    // a single log line was written.
    const stripped = stripEngineEnvelope({
      _caller_worker_id: 'w-1',
      userId: 'u1',
      type: 'workspace-ready',
    })

    expect(stripped).not.toHaveProperty('_caller_worker_id')
    expect(stripped).toEqual({ userId: 'u1', type: 'workspace-ready' })
  })

  it('removes any underscore-prefixed field, not just the known one', () => {
    const stripped = stripEngineEnvelope({ _future_engine_field: 1, userId: 'u1' })
    expect(stripped).toEqual({ userId: 'u1' })
  })

  it('leaves a clean domain payload untouched', () => {
    const payload = { userId: 'u1', type: 'x', title: 't', message: 'm' }
    expect(stripEngineEnvelope(payload)).toEqual(payload)
  })

  it('survives null, undefined and non-objects', () => {
    expect(stripEngineEnvelope(null)).toEqual({})
    expect(stripEngineEnvelope(undefined)).toEqual({})
    expect(stripEngineEnvelope('nope')).toEqual({})
    expect(stripEngineEnvelope([1, 2])).toEqual({})
  })

  it('composes with the strict schema: envelope in, valid payload out', () => {
    const result = consumerSchema.safeParse(
      stripEngineEnvelope({
        _caller_worker_id: 'w-1',
        userId: 'u1',
        type: 'workspace-ready',
        title: 'Welcome',
        message: 'Ready',
      })
    )
    expect(result.success).toBe(true)
  })
})
