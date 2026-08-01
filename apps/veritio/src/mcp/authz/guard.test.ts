import { beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod4'
import type { SupabaseClient } from '@supabase/supabase-js'

vi.mock('../../services/permission-service', () => ({
  checkStudyPermission: vi.fn(),
  checkProjectPermission: vi.fn(),
  checkOrganizationPermission: vi.fn(),
}))

vi.mock('../../services/entitlements-service', () => ({
  assertStudyFeature: vi.fn(),
  assertFeature: vi.fn(),
  getOrgIdForStudy: vi.fn(),
}))

import { checkStudyPermission } from '../../services/permission-service'
import { assertStudyFeature } from '../../services/entitlements-service'
import { EntitlementError } from '../../lib/api/classify-error'
import { invokeTool, type ToolDefinition } from './define-tool'
import type { CallerIdentity } from './define-tool'
import type { ToolContext } from './guard'

const STUDY_ID = '11111111-1111-4111-8111-111111111111'
const supabase = {} as SupabaseClient

const mockCheckStudy = vi.mocked(checkStudyPermission)
const mockAssertStudyFeature = vi.mocked(assertStudyFeature)

/** A representative write tool: needs editor on a study and studies:write. */
function writeTool(handler: ToolDefinition['handler'] = vi.fn(async () => ({ ok: true }))): ToolDefinition {
  return {
    name: 'study_update',
    title: 'Update study',
    description: 'Update study metadata.',
    feature: 'studies',
    inputSchema: z.object({ study_id: z.string().uuid(), title: z.string().min(1) }),
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    scopes: ['studies:write'],
    resource: { kind: 'study', argKey: 'study_id', role: 'editor' },
    handler,
  }
}

const caller = (scopes: CallerIdentity['scopes']): CallerIdentity => ({ userId: 'user-1', scopes })

const validArgs = { study_id: STUDY_ID, title: 'New title' }

beforeEach(() => {
  vi.clearAllMocks()
  mockAssertStudyFeature.mockResolvedValue(undefined)
})

describe('invokeTool authorization gate', () => {
  it('lets an editor through and passes the resolved role to the handler', async () => {
    mockCheckStudy.mockResolvedValue({ allowed: true, userRole: 'editor', error: null })
    const seen: ToolContext[] = []
    const handler: ToolDefinition['handler'] = async (_args, ctx) => {
      seen.push(ctx)
      return { updated: true }
    }

    const outcome = await invokeTool(writeTool(handler), validArgs, caller(['studies:write']), supabase)

    expect(outcome.ok).toBe(true)
    expect(outcome.payload).toEqual({ updated: true })
    expect(seen).toHaveLength(1)
    expect(seen[0]).toMatchObject({ userId: 'user-1', resourceId: STUDY_ID, role: 'editor' })
  })

  it('blocks a viewer from a write tool and never runs the handler', async () => {
    mockCheckStudy.mockResolvedValue({ allowed: false, userRole: 'viewer', error: null })
    const handler = vi.fn(async () => ({ updated: true }))

    const outcome = await invokeTool(writeTool(handler), validArgs, caller(['studies:write']), supabase)

    expect(outcome.ok).toBe(false)
    expect(outcome.payload).toMatchObject({ error: 'permission_denied' })
    expect(handler).not.toHaveBeenCalled()
  })

  it('asks for editor at the required level, not merely membership', async () => {
    mockCheckStudy.mockResolvedValue({ allowed: true, userRole: 'editor', error: null })
    await invokeTool(writeTool(), validArgs, caller(['studies:write']), supabase)

    expect(mockCheckStudy).toHaveBeenCalledWith(supabase, STUDY_ID, 'user-1', 'editor')
  })

  it('does not reveal whether a study exists to a caller with no role', async () => {
    mockCheckStudy.mockResolvedValue({ allowed: false, userRole: null, error: null })
    const denied = await invokeTool(writeTool(), validArgs, caller(['studies:write']), supabase)

    mockCheckStudy.mockResolvedValue({ allowed: false, userRole: null, error: new Error('Study not found') })
    const missing = await invokeTool(writeTool(), validArgs, caller(['studies:write']), supabase)

    // Identical responses: otherwise an agent can enumerate study ids.
    expect(denied.payload).toEqual(missing.payload)
    expect(denied.payload).toMatchObject({ error: 'permission_denied' })
    expect(JSON.stringify(denied.payload)).not.toMatch(/not found/i)
  })

  it('rejects a missing scope before touching the database', async () => {
    const handler = vi.fn(async () => ({ updated: true }))
    const outcome = await invokeTool(writeTool(handler), validArgs, caller(['studies:read']), supabase)

    expect(outcome.ok).toBe(false)
    expect(outcome.payload).toMatchObject({ error: 'insufficient_scope' })
    expect(mockCheckStudy).not.toHaveBeenCalled()
    expect(handler).not.toHaveBeenCalled()
  })

  it('rejects invalid input before authorizing or running the handler', async () => {
    const handler = vi.fn(async () => ({ updated: true }))
    const outcome = await invokeTool(
      writeTool(handler),
      { study_id: 'not-a-uuid', title: '' },
      caller(['studies:write']),
      supabase,
    )

    expect(outcome.ok).toBe(false)
    expect(outcome.payload).toMatchObject({ error: 'invalid_input' })
    expect(String((outcome.payload as { message: string }).message)).toContain('study_id')
    expect(mockCheckStudy).not.toHaveBeenCalled()
    expect(handler).not.toHaveBeenCalled()
  })

  it('fails closed when a declared resource arg is absent from the schema output', async () => {
    const handler = vi.fn(async () => ({ updated: true }))
    const tool: ToolDefinition = {
      ...writeTool(handler),
      // Declares a requirement on an id the schema never produces.
      inputSchema: z.object({ title: z.string() }),
      resource: { kind: 'study', argKey: 'study_id', role: 'editor' },
    }

    const outcome = await invokeTool(tool, { title: 'x' }, caller(['studies:write']), supabase)

    expect(outcome.ok).toBe(false)
    expect(outcome.payload).toMatchObject({ error: 'permission_denied' })
    expect(handler).not.toHaveBeenCalled()
  })

  it('surfaces a plan gate as a distinct, actionable error', async () => {
    mockCheckStudy.mockResolvedValue({ allowed: true, userRole: 'editor', error: null })
    mockAssertStudyFeature.mockRejectedValue(new EntitlementError('Recordings requires the Pro plan.', 'pro'))
    const handler = vi.fn(async () => ({ updated: true }))

    const tool: ToolDefinition = { ...writeTool(handler), entitlement: 'recordings' }
    const outcome = await invokeTool(tool, validArgs, caller(['studies:write']), supabase)

    expect(outcome.ok).toBe(false)
    expect(outcome.payload).toMatchObject({ error: 'plan_required' })
    expect(handler).not.toHaveBeenCalled()
  })

  it('does not leak internals when a handler throws unexpectedly', async () => {
    mockCheckStudy.mockResolvedValue({ allowed: true, userRole: 'editor', error: null })
    const handler = vi.fn(async () => {
      throw new Error('connection string postgres://user:hunter2@db.internal:5432')
    })

    const outcome = await invokeTool(writeTool(handler), validArgs, caller(['studies:write']), supabase)

    expect(outcome.ok).toBe(false)
    expect(outcome.payload).toMatchObject({ error: 'upstream_error' })
    expect(JSON.stringify(outcome.payload)).not.toContain('hunter2')
  })

  it('unwraps the assistant layer result envelope and drops its chat-UI metadata', async () => {
    mockCheckStudy.mockResolvedValue({ allowed: true, userRole: 'editor', error: null })
    const handler = vi.fn(async () => ({
      result: { study_id: STUDY_ID, title: 'New title' },
      dataChanged: ['settings'],
      dataPayload: { huge: 'blob' },
      emitEvent: { topic: 'study-updated', data: {} },
      metadata: { type: 'text' as const },
    }))

    const outcome = await invokeTool(writeTool(handler), validArgs, caller(['studies:write']), supabase)

    expect(outcome.payload).toEqual({ study_id: STUDY_ID, title: 'New title' })
    const serialized = JSON.stringify(outcome.payload)
    expect(serialized).not.toContain('dataChanged')
    expect(serialized).not.toContain('emitEvent')
    expect(serialized).not.toContain('huge')
  })
})
