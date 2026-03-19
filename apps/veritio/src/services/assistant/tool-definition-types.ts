/**
 * Shared type definitions for tool definitions.
 *
 * Used by both tool-definitions.ts and create-tool-definitions.ts to avoid
 * duplicating the ToolParameter and ToolDefinition interfaces.
 */

export interface ToolParameter {
  type: string
  description?: string
  enum?: string[]
  default?: unknown
  items?: Record<string, unknown>
  properties?: Record<string, ToolParameter>
  required?: string[]
}

export interface ToolDefinition<TName extends string = string> {
  type: 'function'
  function: {
    name: TName
    description: string
    parameters: {
      type: 'object'
      properties: Record<string, ToolParameter>
      required?: string[]
    }
  }
}
