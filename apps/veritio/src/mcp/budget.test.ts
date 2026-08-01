import { describe, expect, it } from 'vitest'
import { TOOLS, listTools } from './registry'
import { SERVER_INSTRUCTIONS } from './server'
import { MCP_SCOPES } from './authz/scopes'

/**
 * Context budget.
 *
 * On clients that defer tool definitions (Claude Code does, by default) only
 * names and `instructions` load up front. On every other client the whole
 * listing sits in context for the entire session. These bounds keep the server
 * usable on both, and they are asserted rather than eyeballed because tool
 * count only ever grows.
 *
 * ~4 chars per token is the usual rough conversion; it is approximate, which is
 * why the thresholds have headroom rather than being tight.
 */
const CHARS_PER_TOKEN = 4

function approxTokens(value: unknown): number {
  return Math.ceil(JSON.stringify(value).length / CHARS_PER_TOKEN)
}

/** What a client actually receives from tools/list. */
function listingPayload(): unknown {
  return listTools({ scopes: MCP_SCOPES }).map((t) => ({
    name: t.name,
    title: t.title,
    description: t.description,
    inputSchema: t.inputSchema['~standard'].jsonSchema.input({ target: 'draft-2020-12' }),
    annotations: t.annotations,
  }))
}

describe('context budget', () => {
  it('keeps the advertised surface small enough to reason over', () => {
    // The research is consistent that the effective band is 11-20 advertised
    // tools; past roughly 25 both context cost and selection accuracy degrade.
    const advertised = listTools({ scopes: MCP_SCOPES })
    expect(advertised.length).toBeLessThanOrEqual(25)
  })

  it('fits tools/list inside a 10k token budget', () => {
    const tokens = approxTokens(listingPayload())
    expect(tokens, `tools/list is ~${tokens} tokens`).toBeLessThan(10_000)
  })

  it('keeps server instructions under the 2KB clients truncate at', () => {
    const bytes = Buffer.byteLength(SERVER_INSTRUCTIONS, 'utf8')
    expect(bytes, `instructions are ${bytes} bytes`).toBeLessThan(2048)
    // Truncation cuts the tail, so the part that decides whether the tools get
    // loaded at all has to be near the top.
    expect(SERVER_INSTRUCTIONS.slice(0, 400)).toMatch(/card sort|tree test|study/i)
  })

  it('leaves the long tail deferred rather than advertised', () => {
    const deferred = TOOLS.filter((t) => t.deferred)
    const advertised = listTools({ scopes: MCP_SCOPES })
    for (const tool of deferred) {
      expect(advertised.map((t) => t.name)).not.toContain(tool.name)
    }
  })

  it('the readonly endpoint is smaller still', () => {
    const full = listTools({ scopes: MCP_SCOPES }).length
    const ro = listTools({ scopes: MCP_SCOPES, readOnly: true }).length
    expect(ro).toBeGreaterThan(0)
    expect(ro).toBeLessThan(full)
  })

  it('every tool description is substantive but bounded', () => {
    for (const tool of TOOLS) {
      const bytes = Buffer.byteLength(tool.description, 'utf8')
      expect(bytes, `${tool.name}`).toBeGreaterThan(40)
      expect(bytes, `${tool.name}`).toBeLessThan(2048)
    }
  })
})
