/**
 * Composio Integration Types
 */

export type ComposioToolkit = string

export interface ComposioConnection {
  id: string
  user_id: string
  toolkit: string
  composio_account_id: string | null
  account_display: string | null
  status: string
  created_at: string
  updated_at: string
}

export interface ToolkitConnectionStatus {
  connected: boolean
  account: string | null
}

export interface ConnectionInfo {
  toolkit: string
  name: string
  logo: string | null
  description: string | null
  connected: boolean
  account: string | null
  composioAccountId: string | null
  connectedAt: string | null
}

export interface ToolkitInfo {
  slug: string
  name: string
  description: string
  logo: string
  categories: string[]
}

export interface ToolInfo {
  slug: string
  name: string
  description: string
  inputParameters: Record<string, unknown>
}

