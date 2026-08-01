/**
 * Runtime tool discovery.
 *
 * Veritio has more capability than it should advertise. Every tool in
 * `tools/list` costs context on clients that do not defer tool definitions,
 * and an oversized listing measurably hurts tool selection even on clients
 * that do. So the long tail is registered with `deferred: true`, kept out of
 * the listing, and reached through this pair: `tools_search` returns matching
 * tool names with their argument schemas, and `tool_execute` runs one.
 *
 * The gate in `authz/define-tool.ts` runs identically for a deferred tool, so
 * this is a discovery mechanism and never an authorization bypass.
 */

import { z } from 'zod4'
import type { ToolDefinition } from '../authz/define-tool'
import { invokeTool } from '../authz/define-tool'
import { invalidInput, insufficientScope } from '../authz/errors'

/**
 * The registry is loaded lazily, at call time.
 *
 * These two tools are part of the registry *and* need to read it, which is a
 * genuine import cycle: a static `import { TOOLS } from '../registry'` leaves
 * `META_TOOLS` undefined whenever this module is evaluated first, which is
 * exactly what happens under a unit test that imports it directly. Deferring to
 * the handler body breaks the cycle without either module having to know about
 * the other at load time.
 */
async function registry() {
  return import('../registry')
}

function score(tool: ToolDefinition, terms: string[]): number {
  const haystack = `${tool.name} ${tool.title} ${tool.feature} ${tool.description}`.toLowerCase()
  return terms.reduce((n, term) => (haystack.includes(term) ? n + 1 : n), 0)
}

export const toolsSearch: ToolDefinition = {
  name: 'tools_search',
  title: 'Search Veritio tools',
  description:
    'Find Veritio capabilities that are not exposed as top-level tools. Use this for any Veritio task where ' +
    'no obvious tool exists — panel and participant management, recordings, tags, comments, organization ' +
    'members. Returns each match with its argument schema; run one with tool_execute.',
  feature: 'meta',
  inputSchema: z.object({
    query: z.string().min(1).max(120).describe('What you are trying to do, in plain words.'),
    limit: z.number().int().min(1).max(20).default(8),
  }),
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  scopes: [],
  resource: { kind: 'none' },
  handler: async (args, ctx) => {
    const a = args as { query: string; limit: number }
    const terms = a.query.toLowerCase().split(/\s+/).filter(Boolean)
    const { TOOLS } = await registry()

    const matches = TOOLS.filter((t) => t.name !== 'tools_search' && t.name !== 'tool_execute')
      // Only surface what this credential could actually run.
      .filter((t) => t.scopes.every((s) => ctx.scopes.includes(s)))
      .map((t) => ({ tool: t, rank: score(t, terms) }))
      .filter((m) => m.rank > 0)
      .sort((x, y) => y.rank - x.rank)
      .slice(0, a.limit)

    return {
      query: a.query,
      count: matches.length,
      tools: matches.map(({ tool }) => ({
        name: tool.name,
        title: tool.title,
        description: tool.description,
        feature: tool.feature,
        read_only: tool.annotations.readOnlyHint,
        input_schema: tool.inputSchema['~standard'].jsonSchema.input({ target: 'draft-2020-12' }),
      })),
      ...(matches.length === 0
        ? { hint: 'Nothing matched. Try broader words, or list what you are trying to do differently.' }
        : { hint: 'Run one with tool_execute, passing name and arguments.' }),
    }
  },
}

export const toolExecute: ToolDefinition = {
  name: 'tool_execute',
  title: 'Run a Veritio tool',
  description:
    'Run a tool found via tools_search. Pass its exact name and an arguments object matching the input_schema ' +
    'that tools_search returned. Only use this for tools that are not already available directly.',
  feature: 'meta',
  inputSchema: z.object({
    name: z.string().min(1).describe('Exact tool name from tools_search.'),
    arguments: z.record(z.string(), z.unknown()).default({}),
  }),
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  // Declares no scopes and no resource of its own: it re-checks whichever tool
  // it is asked to run. See the dispatcher tests in registry.test.ts.
  scopes: [],
  resource: { kind: 'none' },
  mutates: 'dispatch',
  handler: async (args, ctx) => {
    const a = args as { name: string; arguments: Record<string, unknown> }

    if (a.name === 'tool_execute' || a.name === 'tools_search') {
      throw invalidInput('tool_execute cannot call itself or tools_search.')
    }

    const { findTool } = await registry()
    const tool = findTool(a.name)
    if (!tool) {
      throw invalidInput(`No Veritio tool named "${a.name}".`, 'Use tools_search to find the correct name.')
    }

    // Re-check scopes here as well as inside invokeTool: this is the one entry
    // point where the tool name comes from the model rather than the registry.
    for (const scope of tool.scopes) {
      if (!ctx.scopes.includes(scope)) throw insufficientScope(scope)
    }

    const outcome = await invokeTool(
      tool,
      a.arguments,
      { userId: ctx.userId, scopes: ctx.scopes, credentialId: ctx.credentialId },
      ctx.supabase,
    )

    // Surface the inner failure as a failure rather than a successful wrapper
    // around an error, so the client's isError flag stays accurate.
    if (!outcome.ok) {
      const payload = outcome.payload as { message?: string }
      throw invalidInput(payload?.message ?? `${a.name} failed.`)
    }
    return outcome.payload
  },
}

export const META_TOOLS: ToolDefinition[] = [toolsSearch, toolExecute]
