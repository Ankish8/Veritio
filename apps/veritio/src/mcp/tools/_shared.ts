/**
 * Helpers shared across tool groups.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { EntitlementError } from '../../lib/api/classify-error'
import { noAccess, planRequired, ToolError } from '../authz/errors'

/**
 * Services report failure by returning `{ error }` rather than throwing.
 * Translate that into the error vocabulary MCP clients understand, collapsing
 * "not found" into "no access" so an agent cannot enumerate ids it cannot see.
 */
export function rethrow(error: Error | null, resource = 'study'): void {
  if (!error) return
  if (error instanceof EntitlementError) throw planRequired('plan', error.message)
  if (/not found|access denied|permission denied|not a member/i.test(error.message)) throw noAccess(resource)
  throw new ToolError('upstream_error', error.message)
}

/** Wrap a service call that throws EntitlementError rather than returning it. */
export async function mapEntitlement<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    if (err instanceof EntitlementError) throw planRequired('plan', err.message)
    throw err
  }
}

/**
 * The study-data handlers in `services/assistant/study-tools.ts` need the
 * study's type, which the caller does not supply — and must not, since letting
 * an agent declare the type would let it pick which analysis path runs.
 */
export async function resolveStudyType(supabase: SupabaseClient, studyId: string): Promise<string> {
  const { data, error } = await supabase.from('studies').select('study_type').eq('id', studyId).single()
  if (error || !data) throw noAccess('study')
  return (data as { study_type: string }).study_type
}

/** Public participation URL for a share code. */
export function participationUrl(shareCode: string | null | undefined): string | null {
  if (!shareCode) return null
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://veritio.io'
  return `${base}/s/${shareCode}`
}

/**
 * Resolve the organization a call should act in.
 *
 * Org-scoped tools take `organization_id` optionally; when it is omitted and
 * the user belongs to exactly one org we use that, which is the common case and
 * saves the agent a round trip. With several orgs we make it ask rather than
 * guessing, because guessing silently searches the wrong workspace.
 */
export async function resolveOrganizationId(
  supabase: SupabaseClient,
  userId: string,
  requested?: string,
): Promise<string> {
  const { data, error } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', userId)
    .not('joined_at', 'is', null)

  if (error) throw new ToolError('upstream_error', error.message)
  const orgIds = ((data ?? []) as Array<{ organization_id: string }>).map((m) => m.organization_id)

  if (requested) {
    if (!orgIds.includes(requested)) throw noAccess('organization')
    return requested
  }
  if (orgIds.length === 1) return orgIds[0]
  if (orgIds.length === 0) throw noAccess('organization')

  throw new ToolError(
    'invalid_input',
    `You belong to ${orgIds.length} organizations, so this call is ambiguous.`,
    `Pass organization_id. Available: ${orgIds.join(', ')}.`,
  )
}
