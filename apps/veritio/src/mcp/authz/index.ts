export { MCP_SCOPES, READONLY_SCOPES, scopesFromPermissions, permissionsFromScopes } from './scopes'
export type { McpScope } from './scopes'

export {
  ToolError,
  invalidInput,
  insufficientScope,
  noAccess,
  needsRole,
  planRequired,
  rateLimited,
} from './errors'
export type { ToolErrorCode } from './errors'

export {
  assertScopes,
  assertResourceAccess,
  assertFeatureAccess,
  orgIdForStudy,
} from './guard'
export type { ResourceKind, ResourceRequirement, ToolContext } from './guard'

export { invokeTool, payloadIsError } from './define-tool'
export type { ToolDefinition, ToolHints, CallerIdentity, ToolOutcome } from './define-tool'
