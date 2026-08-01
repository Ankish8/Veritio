import { beforeEach, describe, expect, it, vi } from 'vitest'
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
  getEntitlements: vi.fn(),
  getOrgPlan: vi.fn(),
}))

import { checkStudyPermission } from '../../services/permission-service'
import { toolExecute, toolsSearch } from './meta'
import { invokeTool } from '../authz/define-tool'
import { MCP_SCOPES, READONLY_SCOPES } from '../authz/scopes'

const supabase = {} as SupabaseClient
const STUDY_ID = '11111111-1111-4111-8111-111111111111'
const mockCheckStudy = vi.mocked(checkStudyPermission)

beforeEach(() => {
  vi.clearAllMocks()
})

/**
 * `tool_execute` is the one tool exempted from the "mutating tools declare a
 * write scope and a resource" invariant, because it carries neither and instead
 * re-checks whichever tool it is asked to run. That exemption is only sound if
 * the re-check actually happens, which is what these tests establish.
 */
describe('tool_execute is not an authorization bypass', () => {
  it('refuses a write tool when the credential is read-only', async () => {
    const outcome = await invokeTool(
      toolExecute,
      { name: 'study_launch', arguments: { study_id: STUDY_ID, confirm: true } },
      { userId: 'u1', scopes: READONLY_SCOPES },
      supabase,
    )

    expect(outcome.ok).toBe(false)
    expect(JSON.stringify(outcome.payload)).toMatch(/scope/i)
    // The inner tool must never have been reached.
    expect(mockCheckStudy).not.toHaveBeenCalled()
  })

  it('still enforces the inner tool`s resource role when scopes are sufficient', async () => {
    mockCheckStudy.mockResolvedValue({ allowed: false, userRole: 'viewer', error: null })

    const outcome = await invokeTool(
      toolExecute,
      { name: 'study_launch', arguments: { study_id: STUDY_ID, confirm: true } },
      { userId: 'u1', scopes: MCP_SCOPES },
      supabase,
    )

    expect(outcome.ok).toBe(false)
    // study_launch needs manager; the mock reports viewer.
    expect(mockCheckStudy).toHaveBeenCalledWith(supabase, STUDY_ID, 'u1', 'manager')
  })

  it('still validates the inner tool`s arguments', async () => {
    const outcome = await invokeTool(
      toolExecute,
      { name: 'study_launch', arguments: { study_id: 'not-a-uuid' } },
      { userId: 'u1', scopes: MCP_SCOPES },
      supabase,
    )

    expect(outcome.ok).toBe(false)
    expect(JSON.stringify(outcome.payload)).toMatch(/study_id|confirm/i)
    expect(mockCheckStudy).not.toHaveBeenCalled()
  })

  it('rejects an unknown tool name', async () => {
    const outcome = await invokeTool(
      toolExecute,
      { name: 'drop_all_studies', arguments: {} },
      { userId: 'u1', scopes: MCP_SCOPES },
      supabase,
    )
    expect(outcome.ok).toBe(false)
    expect(JSON.stringify(outcome.payload)).toContain('drop_all_studies')
  })

  it('refuses to recurse into itself', async () => {
    const outcome = await invokeTool(
      toolExecute,
      { name: 'tool_execute', arguments: { name: 'study_get', arguments: {} } },
      { userId: 'u1', scopes: MCP_SCOPES },
      supabase,
    )
    expect(outcome.ok).toBe(false)
    expect(JSON.stringify(outcome.payload)).toMatch(/cannot call itself/i)
  })
})

describe('tools_search', () => {
  it('only surfaces tools the credential could actually run', async () => {
    const outcome = await invokeTool(
      toolsSearch,
      { query: 'launch study live', limit: 10 },
      { userId: 'u1', scopes: READONLY_SCOPES },
      supabase,
    )

    expect(outcome.ok).toBe(true)
    const names = (outcome.payload as { tools: Array<{ name: string }> }).tools.map((t) => t.name)
    expect(names).not.toContain('study_launch')
  })

  it('returns a usable argument schema for each match', async () => {
    const outcome = await invokeTool(
      toolsSearch,
      { query: 'results', limit: 5 },
      { userId: 'u1', scopes: MCP_SCOPES },
      supabase,
    )

    const tools = (outcome.payload as { tools: Array<{ name: string; input_schema: unknown }> }).tools
    expect(tools.length).toBeGreaterThan(0)
    for (const t of tools) {
      expect(t.input_schema).toMatchObject({ type: 'object' })
    }
  })

  it('never advertises itself or the dispatcher', async () => {
    const outcome = await invokeTool(
      toolsSearch,
      { query: 'tool run search execute', limit: 20 },
      { userId: 'u1', scopes: MCP_SCOPES },
      supabase,
    )
    const names = (outcome.payload as { tools: Array<{ name: string }> }).tools.map((t) => t.name)
    expect(names).not.toContain('tools_search')
    expect(names).not.toContain('tool_execute')
  })

  it('surfaces the deferred long tail that tools/list withholds', async () => {
    // The point of deferring panel/collaboration tools is that they stay
    // reachable. If tools_search cannot find them they are simply missing.
    const cases: Array<[string, string]> = [
      ['panel participants', 'panel_participants_list'],
      ['recordings', 'recordings_list'],
      ['comment on a study', 'study_comments_list'],
      ['tags', 'study_tags_list'],
      ['segments', 'panel_segments_list'],
    ]

    for (const [query, expected] of cases) {
      const outcome = await invokeTool(
        toolsSearch,
        { query, limit: 20 },
        { userId: 'u1', scopes: MCP_SCOPES },
        supabase,
      )
      const names = (outcome.payload as { tools: Array<{ name: string }> }).tools.map((t) => t.name)
      expect(names, `"${query}" should surface ${expected}`).toContain(expected)
    }
  })

  it('returns an actionable hint when nothing matches', async () => {
    const outcome = await invokeTool(
      toolsSearch,
      { query: 'zzzzqqqq', limit: 5 },
      { userId: 'u1', scopes: MCP_SCOPES },
      supabase,
    )
    const payload = outcome.payload as { count: number; hint: string }
    expect(payload.count).toBe(0)
    expect(payload.hint).toBeTruthy()
  })
})
