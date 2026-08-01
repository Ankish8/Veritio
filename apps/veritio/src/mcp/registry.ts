/**
 * The tool registry.
 *
 * One flat, ordered list is the source of truth for `tools/list`, for the
 * `?features=` filter, for `tools_search`, and for the invariant test that
 * proves no tool ships without an authorization requirement.
 *
 * Ordering is deliberate and stable: the spec asks servers to return tools in
 * a deterministic order so clients (and the model's prompt cache) can cache
 * the listing.
 */

import type { ToolDefinition } from './authz/define-tool'
import type { McpScope } from './authz/scopes'
import { DISCOVERY_TOOLS } from './tools/discovery'
import { STUDY_TOOLS } from './tools/studies'
import { CONTENT_TOOLS } from './tools/content'
import { RESULTS_TOOLS } from './tools/results'
import { DELIVERY_TOOLS } from './tools/delivery'
import { PANEL_TOOLS } from './tools/panel'
import { COLLABORATION_TOOLS } from './tools/collaboration'
import { META_TOOLS } from './tools/meta'

/**
 * Order is discovery -> lifecycle -> configuration -> results -> delivery ->
 * meta, which is roughly the order an agent needs them in and keeps the
 * listing stable for client and prompt caching.
 */
export const TOOLS: readonly ToolDefinition[] = Object.freeze([
  ...DISCOVERY_TOOLS,
  ...STUDY_TOOLS,
  ...CONTENT_TOOLS,
  ...RESULTS_TOOLS,
  ...DELIVERY_TOOLS,
  // Deferred groups: registered and fully authorized, but withheld from
  // tools/list and reached via tools_search / tool_execute.
  ...PANEL_TOOLS,
  ...COLLABORATION_TOOLS,
  ...META_TOOLS,
])

const BY_NAME = new Map(TOOLS.map((t) => [t.name, t]))

export function findTool(name: string): ToolDefinition | undefined {
  return BY_NAME.get(name)
}

/** Distinct `feature` groups, for the `?features=` filter and for docs. */
export function toolFeatures(): string[] {
  return [...new Set(TOOLS.map((t) => t.feature))].sort()
}

export interface ListOptions {
  /** Scopes the credential actually holds. Tools needing more are hidden. */
  scopes: readonly McpScope[]
  /** Restrict to these `feature` groups. Omit for all. */
  features?: readonly string[]
  /** The read-only endpoint advertises only non-mutating tools. */
  readOnly?: boolean
  /** Include tools normally reachable only via tools_search. */
  includeDeferred?: boolean
}

/**
 * Which tools to advertise on `tools/list`.
 *
 * Hiding tools the credential cannot use is not a security control — the gate
 * in `define-tool.ts` is — but it keeps the listing small, which matters
 * because every advertised tool costs context on clients that do not defer
 * tool definitions.
 */
export function listTools(opts: ListOptions): ToolDefinition[] {
  return TOOLS.filter((tool) => {
    if (!opts.includeDeferred && tool.deferred) return false
    if (opts.readOnly && !tool.annotations.readOnlyHint) return false
    if (opts.features && !opts.features.includes(tool.feature)) return false
    return tool.scopes.every((s) => opts.scopes.includes(s))
  })
}

/** A tool mutates if it is not marked read-only. */
export function isMutating(tool: ToolDefinition): boolean {
  return !tool.annotations.readOnlyHint
}
