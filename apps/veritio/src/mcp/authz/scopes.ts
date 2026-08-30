/**
 * MCP scopes.
 *
 * These map onto the `permissions` record that better-auth's apiKey plugin
 * stores per key (`Record<string, string[]>`), and onto OAuth scope strings
 * once the `mcp()` plugin is enabled. One vocabulary for both.
 *
 * Scopes gate *what kind* of operation a credential may attempt. They are not
 * a substitute for the per-resource role check in `guard.ts` — a key with
 * `studies:write` still cannot touch a study the user is only a viewer on.
 */

export const MCP_SCOPES = [
  'studies:read',
  'studies:write',
  'results:read',
  'panel:read',
  'panel:write',
  'org:read',
  'org:write',
  'export:write',
] as const

export type McpScope = (typeof MCP_SCOPES)[number]

/** Scopes granted to the read-only endpoint, regardless of what the key holds. */
export const READONLY_SCOPES: readonly McpScope[] = ['studies:read', 'results:read', 'panel:read', 'org:read']

/**
 * better-auth's apiKey plugin stores permissions as `{ resource: [action, ...] }`.
 * Convert that shape into our flat scope strings.
 */
export function scopesFromPermissions(permissions: Record<string, string[]> | null | undefined): McpScope[] {
  if (!permissions) return []
  const flat: string[] = []
  for (const [resource, actions] of Object.entries(permissions)) {
    for (const action of actions) flat.push(`${resource}:${action}`)
  }
  return MCP_SCOPES.filter((s) => flat.includes(s))
}

/** Inverse of `scopesFromPermissions`, for issuing keys. */
export function permissionsFromScopes(scopes: readonly McpScope[]): Record<string, string[]> {
  const out: Record<string, string[]> = {}
  for (const scope of scopes) {
    const [resource, action] = scope.split(':')
    ;(out[resource] ??= []).push(action)
  }
  return out
}
