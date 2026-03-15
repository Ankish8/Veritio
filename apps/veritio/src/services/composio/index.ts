/**
 * Composio Integration Service
 *
 * Manages OAuth connections to external tools via Composio SDK.
 * Supports dynamic toolkit discovery alongside legacy Google Sheets / Notion integrations.
 */

import { Composio } from '@composio/core'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@veritio/study-types'
import type { ComposioConnection, ToolkitInfo, ToolInfo } from './types'
import * as cache from './cache'

export type { ComposioToolkit, ComposioConnection, ToolkitConnectionStatus, ConnectionInfo, ToolkitInfo, ToolInfo } from './types'

type SupabaseClientType = SupabaseClient<Database>

// composio_connections table is not yet in generated DB types (migration pending).
 
const fromConnections = (supabase: SupabaseClientType) => (supabase as any).from('composio_connections')

const CACHE_TTL_MS = 10 * 60 * 1000 // 10 minutes
const EXECUTE_TIMEOUT_MS = 60_000 // 60 seconds

/**
 * Pinned toolkit versions (permanent, process lifetime).
 * Ensures executeAction() always uses the same version the LLM was given.
 */
const pinnedToolkitVersions = new Map<string, string>()

function toErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Unknown error'
}

let composioClient: Composio | null = null

export function getComposioClient(): Composio {
  if (!composioClient) {
    const apiKey = process.env.COMPOSIO_API_KEY
    if (!apiKey) throw new Error('COMPOSIO_API_KEY is not set')
    composioClient = new Composio({ apiKey })
  }
  return composioClient
}

export function isComposioConfigured(): boolean {
  return !!process.env.COMPOSIO_API_KEY
}

export function resolveToolkitSlug(toolkit: string): string {
  return toolkit
}

export function toolkitDisplayName(slug: string): string {
  return slug
    .split(/[_-]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

// ---------------------------------------------------------------------------
// Connection CRUD
// ---------------------------------------------------------------------------

export async function getComposioConnections(
  supabase: SupabaseClientType,
  userId: string
): Promise<{ data: ComposioConnection[]; error: Error | null }> {
  const { data, error } = await fromConnections(supabase)
    .select('*')
    .eq('user_id', userId)

  if (error) return { data: [], error: new Error(error.message) }
  return { data: (data || []) as ComposioConnection[], error: null }
}

export async function getComposioConnection(
  supabase: SupabaseClientType,
  userId: string,
  toolkit: string
): Promise<{ data: ComposioConnection | null; error: Error | null }> {
  const { data, error } = await fromConnections(supabase)
    .select('*')
    .eq('user_id', userId)
    .eq('toolkit', toolkit)
    .maybeSingle()

  if (error) return { data: null, error: new Error(error.message) }
  return { data: data as ComposioConnection | null, error: null }
}

export async function saveComposioConnection(
  supabase: SupabaseClientType,
  userId: string,
  toolkit: string,
  composioAccountId: string,
  accountDisplay: string | null
): Promise<{ data: ComposioConnection | null; error: Error | null }> {
  const { data, error } = await fromConnections(supabase)
    .upsert(
      {
        user_id: userId,
        toolkit,
        composio_account_id: composioAccountId,
        account_display: accountDisplay,
        status: 'active',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,toolkit' }
    )
    .select()
    .single()

  if (error) return { data: null, error: new Error(error.message) }
  return { data: data as ComposioConnection, error: null }
}

export async function deleteComposioConnection(
  supabase: SupabaseClientType,
  userId: string,
  toolkit: string
): Promise<{ success: boolean; error: Error | null }> {
  const { error } = await fromConnections(supabase)
    .delete()
    .eq('user_id', userId)
    .eq('toolkit', toolkit)

  if (error) return { success: false, error: new Error(error.message) }
  return { success: true, error: null }
}

// ---------------------------------------------------------------------------
// OAuth
// ---------------------------------------------------------------------------

export async function initiateConnection(
  userId: string,
  toolkit: string,
  callbackUrl: string
): Promise<{ authUrl: string; error: Error | null }> {
  try {
    const client = getComposioClient()
    const session = await client.create(userId, { manageConnections: false })
    const connectionRequest = await session.authorize(toolkit, { callbackUrl })

    return { authUrl: connectionRequest.redirectUrl || '', error: null }
  } catch (err) {
    return {
      authUrl: '',
      error: new Error(`Failed to initiate ${toolkit} connection: ${toErrorMessage(err)}`),
    }
  }
}

export async function verifyConnection(
  composioAccountId: string
): Promise<{
  data: { id: string; appName: string; accountDisplay: string | null } | null
  error: Error | null
}> {
  try {
    const client = getComposioClient()
    const account = await client.connectedAccounts.get(composioAccountId)

    if (!account?.toolkit?.slug) {
      return { data: null, error: new Error('Invalid connected account response') }
    }

    return {
      data: { id: account.id, appName: account.toolkit.slug, accountDisplay: null },
      error: null,
    }
  } catch (err) {
    return { data: null, error: new Error(`Failed to verify connection: ${toErrorMessage(err)}`) }
  }
}

// ---------------------------------------------------------------------------
// Tool execution
// ---------------------------------------------------------------------------

function createTimeout(ms: number): Promise<never> {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`Timed out after ${ms / 1000}s`)), ms)
  )
}

export async function executeAction(
  userId: string,
  actionName: string,
  params: Record<string, unknown>,
  connectedAccountId?: string
): Promise<{ data: unknown; error: Error | null }> {
  try {
    const client = getComposioClient()
    const toolkitSlug = actionName.split('_')[0]?.toLowerCase() || ''
    const version = await getToolkitVersion(toolkitSlug)

    const executeOpts: Record<string, unknown> = {
      userId,
      connectedAccountId,
      arguments: params,
    }
    if (version) executeOpts.version = version

    const result = await Promise.race([
      client.tools.execute(actionName, executeOpts as any),
      createTimeout(EXECUTE_TIMEOUT_MS),
    ])

    // Composio SDK wraps responses in { data, error, successful, logId }
    if (result && typeof result === 'object') {
      if ('successful' in result && !(result as any).successful) {
        const errMsg = ('error' in result ? String((result as any).error) : null) || 'Tool execution failed'
        return { data: null, error: new Error(`${actionName}: ${errMsg}`) }
      }
      if ('data' in result) {
        return { data: (result as { data: unknown }).data, error: null }
      }
    }

    return { data: result, error: null }
  } catch (err) {
    return { data: null, error: new Error(`Failed to execute ${actionName}: ${toErrorMessage(err)}`) }
  }
}

// ---------------------------------------------------------------------------
// Dynamic toolkit / tool discovery
// ---------------------------------------------------------------------------

const TOOLKIT_CATEGORIES = [
  'Productivity',
  'Communication',
  'CRM',
  'Project Management',
  'Developer Tools',
  'Storage',
  'Analytics',
  'Marketing',
  'Design',
  'Finance',
  'HR',
  'Other',
]

export function listToolkitCategories(): string[] {
  return TOOLKIT_CATEGORIES
}

 
function getInnerClient(): any {
  const composio = getComposioClient()
   
  return (composio as any).client
}

export async function listToolkits(params: {
  search?: string
  category?: string
  limit?: number
  cursor?: string
}): Promise<{ data: ToolkitInfo[]; nextCursor: string | null; total: number; error: Error | null }> {
  const cacheKey = `toolkits:${JSON.stringify(params)}`
  const cached = cache.get<{ toolkits: ToolkitInfo[]; nextCursor: string | null; total: number }>(cacheKey)
  if (cached) return { data: cached.toolkits, nextCursor: cached.nextCursor, total: cached.total, error: null }

  try {
    const inner = getInnerClient()

    // Composio API rejects search strings shorter than 3 characters
    const query: Record<string, unknown> = {}
    if (params.search && params.search.length >= 3) query.search = params.search
    if (params.category) query.category = params.category
    if (params.limit) query.limit = params.limit
    if (params.cursor) query.cursor = params.cursor

    const result = await inner.toolkits.list(query)
    const items = result?.items ?? []

    const toolkits: ToolkitInfo[] = items.map((item: any) => {
      const meta = item.meta ?? {}
      return {
        slug: item.slug ?? '',
        name: item.name ?? toolkitDisplayName(item.slug ?? ''),
        description: meta.description ?? '',
        logo: meta.logo ?? '',
        categories: Array.isArray(meta.categories) ? meta.categories.map((c: { name: string }) => c.name) : [],
      }
    })

    const nextCursor = result?.next_cursor ?? null
    const total = result?.total_items ?? 0

    cache.set(cacheKey, { toolkits, nextCursor, total }, CACHE_TTL_MS)
    return { data: toolkits, nextCursor, total, error: null }
  } catch (err) {
    return { data: [], nextCursor: null, total: 0, error: new Error(`Failed to list toolkits: ${toErrorMessage(err)}`) }
  }
}

export async function getToolkitVersion(toolkit: string): Promise<string | undefined> {
  const pinned = pinnedToolkitVersions.get(toolkit)
  if (pinned) return pinned

  try {
    const client = getComposioClient()
    const tools = await client.tools.getRawComposioTools({ toolkits: [toolkit], limit: 1 } as any)

    if (Array.isArray(tools) && tools.length > 0) {
      const version = (tools[0] as any).version
      if (version) {
        pinnedToolkitVersions.set(toolkit, version)
        return version
      }
    }
  } catch {
    // Failed to get version, continue without pinning
  }

  return undefined
}

export async function listToolsForToolkit(
  toolkit: string,
  params?: { search?: string; limit?: number; useImportantFilter?: boolean }
): Promise<{ data: ToolInfo[]; error: Error | null }> {
  const useImportant = params?.useImportantFilter !== false
  const cacheKey = `tools:${toolkit}:${JSON.stringify(params ?? {})}:important=${useImportant}`
  const cached = cache.get<ToolInfo[]>(cacheKey)

  if (cached) {
    // Ensure version is pinned even on cache hits
    await getToolkitVersion(toolkit)
    return { data: cached, error: null }
  }

  try {
    const client = getComposioClient()

    const query: Record<string, unknown> = {
      toolkits: [toolkit],
      search: params?.search,
      limit: params?.limit ?? 50,
    }
    if (useImportant) query.important = true

     
    const result = await client.tools.getRawComposioTools(query as any)
    const items = Array.isArray(result) ? result : []

    const tools: ToolInfo[] = items.map((item) => ({
      slug: item.slug ?? '',
      name: item.name ?? (item as any).displayName ?? '',
      description: item.description ?? '',
      inputParameters: item.inputParameters ?? {},
    }))

    cache.set(cacheKey, tools, CACHE_TTL_MS)

    // Pin toolkit version from first tool
    if (items.length > 0) {
      const version = (items[0] as any).version
      if (version && !pinnedToolkitVersions.has(toolkit)) {
        pinnedToolkitVersions.set(toolkit, version)
      }
    }

    return { data: tools, error: null }
  } catch (err) {
    return { data: [], error: new Error(`Failed to list tools for ${toolkit}: ${toErrorMessage(err)}`) }
  }
}
