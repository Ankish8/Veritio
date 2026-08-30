/**
 * `defineTool` — the only way a Veritio MCP tool is allowed to exist.
 *
 * Wrapping registration (rather than asking handlers to call a guard) means a
 * tool cannot forget to authorize: the scope check, the per-resource role
 * check, the plan check and input validation all happen before the handler
 * body runs, and the handler receives an already-authorized context.
 *
 * It also normalizes output. The `services/assistant/` handlers this layer
 * wraps return a UI-shaped `ToolExecutionResult` carrying `dataChanged`,
 * `dataPayload` and `emitEvent` for the in-app chat client. None of that means
 * anything to an MCP client, and `{ error: '...' }` is not how MCP reports
 * failure, so both are translated here.
 */

// `StandardSchemaWithJSON` (rather than plain `StandardSchemaV1`) is what
// registerTool requires: it carries `~standard.jsonSchema`, which the SDK uses
// to emit the tool's JSON Schema without a conversion step. zod 4.2+ provides
// it natively, which is why this layer is on the `zod4` alias.
import type { StandardSchemaWithJSON } from '@modelcontextprotocol/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { FeatureKey } from '../../lib/plans'
import { ToolError, invalidInput } from './errors'
import type { McpScope } from './scopes'
import {
  assertScopes,
  assertResourceAccess,
  assertFeatureAccess,
  type ResourceRequirement,
  type ToolContext,
} from './guard'

/** MCP tool annotations. Clients use these to decide what needs confirmation. */
export interface ToolHints {
  readOnlyHint: boolean
  destructiveHint?: boolean
  idempotentHint?: boolean
  openWorldHint?: boolean
}

export interface ToolDefinition<TArgs = Record<string, unknown>> {
  name: string
  title: string
  /** Keep this tight. Claude Code truncates tool descriptions at 2KB. */
  description: string
  /** Grouping for the `?features=` filter and for `tools_search`. */
  feature: string
  inputSchema: StandardSchemaWithJSON
  annotations: ToolHints
  scopes: readonly McpScope[]
  resource: ResourceRequirement
  /**
   * What a mutating tool actually mutates. Drives the authorization invariant
   * in `registry.test.ts`, which would otherwise be too crude to distinguish
   * three genuinely different cases:
   *
   * - `'config'` (the default) — study content, settings, or lifecycle.
   *   Requires `editor` or above on a specific resource.
   * - `'derived'` — produces an artifact (an export, a report) from data the
   *   caller can already read. Requires only `viewer`, because it grants no
   *   access the caller did not already have; the write is a job record, not a
   *   change to the study.
   * - `'dispatch'` — runs another registered tool, re-checking that tool's
   *   scopes and resource requirement. Carries none of its own, by design.
   * - `'resolved'` — the target organization is not an argument; it is resolved
   *   from the caller's memberships inside the handler, so the declarative gate
   *   has nothing to read. Such a handler MUST call `resolveOrganizationId`
   *   (which refuses an organization the caller does not belong to) and the
   *   service it delegates to MUST perform the role check. Asserted in
   *   `registry.test.ts`.
   */
  mutates?: 'config' | 'derived' | 'dispatch' | 'resolved'
  /** Plan entitlement required, if any. */
  entitlement?: FeatureKey
  /**
   * Tools omitted from `tools/list` and reachable only via
   * `tools_search` + `tool_execute`. Keeps the advertised surface small
   * without giving up coverage.
   */
  deferred?: boolean
  /** 1-5 realistic calls. Materially improves parameter accuracy. */
  examples?: Array<{ description: string; arguments: Record<string, unknown> }>
  handler: (args: TArgs, ctx: ToolContext) => Promise<unknown>
}

export interface CallerIdentity {
  userId: string
  scopes: readonly McpScope[]
  credentialId?: string
}

/** What a tool call resolves to before it is encoded as an MCP result. */
export interface ToolOutcome {
  ok: boolean
  payload: unknown
}

/**
 * Run one tool call end to end: scopes, resource authorization, plan gate,
 * input validation, handler, output normalization.
 *
 * Never throws for caller-fixable problems — those come back as
 * `{ ok: false }` so the transport layer can set `isError: true` and let the
 * model self-correct.
 */
export async function invokeTool(
  def: ToolDefinition,
  rawArgs: unknown,
  caller: CallerIdentity,
  supabase: SupabaseClient,
): Promise<ToolOutcome> {
  try {
    assertScopes(caller.scopes, def.scopes)

    const args = await validate(def.inputSchema, rawArgs)

    const { resourceId, role } = await assertResourceAccess(
      supabase,
      caller.userId,
      def.resource,
      args,
      def.name,
    )

    if (def.entitlement) {
      await assertFeatureAccess(supabase, def.resource, resourceId, def.entitlement)
    }

    const ctx: ToolContext = {
      supabase,
      userId: caller.userId,
      scopes: caller.scopes,
      resourceId,
      role,
      credentialId: caller.credentialId,
    }

    return { ok: true, payload: normalize(await def.handler(args, ctx)) }
  } catch (err) {
    if (err instanceof ToolError) {
      return { ok: false, payload: { error: err.code, message: err.toAgentMessage() } }
    }
    // An unexpected throw is a server fault. Do not surface internals to the
    // model — it cannot act on a stack trace and the text may carry PII.
    console.error(`[mcp] ${def.name} failed`, err)
    return {
      ok: false,
      payload: {
        error: 'upstream_error',
        message: 'Veritio could not complete that operation. This is a server-side problem, not a bad request.',
      },
    }
  }
}

async function validate(schema: StandardSchemaWithJSON, rawArgs: unknown): Promise<Record<string, unknown>> {
  const result = await schema['~standard'].validate(rawArgs ?? {})
  if (result.issues) {
    const detail = result.issues
      .map((i) => {
        const path = i.path?.map((p) => (typeof p === 'object' ? p.key : p)).join('.')
        return path ? `${path}: ${i.message}` : i.message
      })
      .join('; ')
    throw invalidInput(`Invalid arguments — ${detail}.`, 'Fix the named fields and call again.')
  }
  return result.value as Record<string, unknown>
}

/**
 * Strip the assistant layer's chat-UI metadata.
 *
 * `services/assistant/` handlers return `{ result, metadata?, dataChanged?,
 * dataPayload?, emitEvent?, autoResponse? }`. Only `result` is meaningful to an
 * MCP client; the rest drives the in-app chat surface and would be noise (and
 * wasted tokens) in an agent's context.
 */
function normalize(raw: unknown): unknown {
  if (raw && typeof raw === 'object' && 'result' in raw) {
    return (raw as { result: unknown }).result
  }
  return raw
}

/**
 * Assistant handlers signal failure with `{ error: string }` in their payload
 * rather than throwing. Detect that so the transport can flag `isError`.
 */
export function payloadIsError(payload: unknown): boolean {
  return Boolean(payload && typeof payload === 'object' && 'error' in payload)
}
