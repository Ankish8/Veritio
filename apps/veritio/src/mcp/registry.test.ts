import { describe, expect, it } from 'vitest'
import { TOOLS, listTools, findTool, isMutating, toolFeatures } from './registry'
import { MCP_SCOPES, READONLY_SCOPES, type McpScope } from './authz/scopes'

const ROLE_RANK = { viewer: 0, editor: 1, manager: 2, admin: 3, owner: 4 } as const

/**
 * These are invariants, not examples.
 *
 * They run over the whole registry so a tool added next month cannot quietly
 * skip authorization. Every failure here is a potential IDOR, because the
 * backend runs on a service-role Supabase client with RLS bypassed — nothing
 * below this layer will catch a missing check.
 */
describe('registry invariants', () => {
  it('has at least one tool', () => {
    expect(TOOLS.length).toBeGreaterThan(0)
  })

  it.each(TOOLS.map((t) => [t.name, t] as const))('%s declares a resource requirement or is explicitly global', (_name, tool) => {
    expect(tool.resource).toBeDefined()
    if (tool.resource.kind !== 'none') {
      expect(tool.resource.argKey).toBeTruthy()
      expect(ROLE_RANK).toHaveProperty(tool.resource.role)
    }
  })

  it('every config-mutating tool is scoped to a specific resource at editor or above', () => {
    const offenders = TOOLS.filter(isMutating)
      .filter((t) => (t.mutates ?? 'config') === 'config')
      .filter((t) => t.resource.kind === 'none' || ROLE_RANK[t.resource.role] < ROLE_RANK.editor)
    expect(offenders.map((t) => t.name)).toEqual([])
  })

  it('membership-resolved writes actually resolve membership', () => {
    // `mutates: 'resolved'` waives the declarative resource gate because the
    // organization is not an argument. What replaces it is `resolveOrganizationId`,
    // which refuses an org the caller is not a member of. Reading the handler
    // source is crude, but it is the only mechanical check available, and the
    // alternative is trusting a comment.
    const resolved = TOOLS.filter((t) => t.mutates === 'resolved')
    expect(resolved.length).toBeGreaterThan(0)
    for (const tool of resolved) {
      expect(tool.handler.toString(), `${tool.name} must call resolveOrganizationId`).toMatch(
        /resolveOrganizationId/,
      )
    }
  })

  it('derived-artifact tools still bind to a specific resource, at viewer or above', () => {
    // Exports and reports legitimately need only viewer — they surface data the
    // caller can already read — but they must still name their resource.
    const offenders = TOOLS.filter((t) => t.mutates === 'derived').filter((t) => t.resource.kind === 'none')
    expect(offenders.map((t) => t.name)).toEqual([])
  })

  it('every mutating tool requires a write scope, except the dispatcher', () => {
    const offenders = TOOLS.filter(isMutating)
      .filter((t) => t.mutates !== 'dispatch')
      .filter((t) => !t.scopes.some((s) => s.endsWith(':write')))
    expect(offenders.map((t) => t.name)).toEqual([])
  })

  it('only tool_execute is allowed to be a dispatcher', () => {
    // A dispatcher carries no scopes or resource of its own, so this exemption
    // must stay a closed set of exactly the tool whose behaviour is tested below.
    expect(TOOLS.filter((t) => t.mutates === 'dispatch').map((t) => t.name)).toEqual(['tool_execute'])
  })

  it('no read-only tool requests a write scope', () => {
    // export_status is the one exception, and deliberately so: it returns a
    // download URL for a completed export, which is the same bulk data
    // `export:write` gates the creation of. Gating the read on a read scope
    // would let a results-only credential collect exports it could not make.
    const EXPORT_READS = ['export_status']
    const offenders = TOOLS.filter((t) => !isMutating(t))
      .filter((t) => !EXPORT_READS.includes(t.name))
      .filter((t) => t.scopes.some((s) => s.endsWith(':write')))
    expect(offenders.map((t) => t.name)).toEqual([])
  })

  it('the resource argKey exists in the tool input schema', async () => {
    for (const tool of TOOLS) {
      if (tool.resource.kind === 'none') continue
      // Probing with an empty object surfaces the required key as an issue,
      // which proves the schema actually declares it.
      const result = await tool.inputSchema['~standard'].validate({})
      const paths = (result.issues ?? []).map((i) =>
        (i.path ?? []).map((p) => (typeof p === 'object' ? String(p.key) : String(p))).join('.'),
      )
      expect(paths, `${tool.name} must require ${tool.resource.argKey}`).toContain(tool.resource.argKey)
    }
  })

  it('destructive tools are marked so clients can prompt for confirmation', () => {
    // Anything that takes a study live or changes its lifecycle is destructive.
    const lifecycle = TOOLS.filter((t) => /launch|set_status|delete|archive/.test(t.name))
    for (const tool of lifecycle) {
      expect(tool.annotations.destructiveHint, `${tool.name} should set destructiveHint`).toBe(true)
    }
  })

  it('declares only known scopes', () => {
    for (const tool of TOOLS) {
      for (const scope of tool.scopes) expect(MCP_SCOPES).toContain(scope)
    }
  })

  it('has unique, spec-legal tool names', () => {
    const names = TOOLS.map((t) => t.name)
    expect(new Set(names).size).toBe(names.length)
    for (const name of names) {
      expect(name).toMatch(/^[A-Za-z0-9_.-]{1,128}$/)
    }
  })

  it('keeps descriptions inside the 2KB clients truncate at', () => {
    for (const tool of TOOLS) {
      expect(Buffer.byteLength(tool.description, 'utf8'), `${tool.name} description too long`).toBeLessThan(2048)
      expect(tool.description.length, `${tool.name} needs a real description`).toBeGreaterThan(20)
    }
  })

  it('returns tools in a stable order for client and prompt caching', () => {
    expect(listTools({ scopes: MCP_SCOPES }).map((t) => t.name)).toEqual(
      listTools({ scopes: MCP_SCOPES }).map((t) => t.name),
    )
  })
})

describe('listTools', () => {
  it('hides tools whose scopes the credential lacks', () => {
    const readOnlyCreds: McpScope[] = ['studies:read']
    const names = listTools({ scopes: readOnlyCreds }).map((t) => t.name)
    expect(names).toContain('study_get')
    expect(names).not.toContain('study_create')
  })

  it('the read-only endpoint advertises no mutating tool, even with write scopes', () => {
    const listed = listTools({ scopes: MCP_SCOPES, readOnly: true })
    expect(listed.every((t) => t.annotations.readOnlyHint)).toBe(true)
    expect(listed.map((t) => t.name)).not.toContain('study_launch')
  })

  it('the readonly scope set reaches no mutating tool except the dispatcher', () => {
    // tool_execute is visible because it declares no scopes; it is safe because
    // it re-checks the inner tool's scopes. That behaviour is asserted in
    // tools/meta.test.ts rather than assumed here.
    const reachable = listTools({ scopes: READONLY_SCOPES }).filter(isMutating)
    expect(reachable.map((t) => t.name)).toEqual(['tool_execute'])
  })

  it('filters by feature group', () => {
    const features = toolFeatures()
    expect(features.length).toBeGreaterThan(0)
    const listed = listTools({ scopes: MCP_SCOPES, features: [features[0]] })
    expect(listed.every((t) => t.feature === features[0])).toBe(true)
  })

  it('omits deferred tools unless asked', () => {
    const advertised = listTools({ scopes: MCP_SCOPES })
    expect(advertised.every((t) => !t.deferred)).toBe(true)
  })
})

describe('findTool', () => {
  it('resolves every registered name', () => {
    for (const tool of TOOLS) expect(findTool(tool.name)).toBe(tool)
  })

  it('returns undefined for an unknown name', () => {
    expect(findTool('nope')).toBeUndefined()
  })
})
