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
export interface OrganizationSummary {
  id: string
  name: string
  slug: string | null
}

/**
 * The organizations a user belongs to, named.
 *
 * TWO QUERIES, NOT AN EMBED. PostgREST can only join `organization_members` to
 * `organizations` if it can infer the relationship, and a tool that silently
 * returns nothing when that inference fails would present as "you belong to no
 * workspaces" — the reassuring wrong answer. Two explicit reads cannot do that.
 *
 * ONE BODY, TWO CALLERS: `organization_list` and the ambiguity refusal below.
 * The refusal used to name ids only, which is all an agent needs and nothing a
 * PERSON can choose between — Merlin's org picker had to render raw UUIDs.
 */
export async function listOrganizations(
  supabase: SupabaseClient,
  userId: string,
): Promise<OrganizationSummary[]> {
  const { data, error } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', userId)
    .not('joined_at', 'is', null)
  if (error) throw new ToolError('upstream_error', error.message)

  const orgIds = ((data ?? []) as Array<{ organization_id: string }>).map((m) => m.organization_id)
  if (orgIds.length === 0) return []

  const { data: orgs, error: orgError } = await supabase
    .from('organizations')
    .select('id, name, slug')
    .in('id', orgIds)
    .is('deleted_at', null)
  if (orgError) throw new ToolError('upstream_error', orgError.message)

  const named = new Map(
    ((orgs ?? []) as Array<{ id: string; name: string; slug: string | null }>).map((o) => [o.id, o]),
  )
  // Membership is the authority on WHICH orgs; the name lookup only decorates.
  // An org row that could not be read keeps its membership and loses its name,
  // rather than disappearing from a list somebody is choosing from.
  return orgIds.map((id) => ({
    id,
    name: named.get(id)?.name ?? id,
    slug: named.get(id)?.slug ?? null,
  }))
}

export async function resolveOrganizationId(
  supabase: SupabaseClient,
  userId: string,
  requested?: string,
): Promise<string> {
  const orgs = await listOrganizations(supabase, userId)
  const orgIds = orgs.map((o) => o.id)

  if (requested) {
    if (!orgIds.includes(requested)) throw noAccess('organization')
    return requested
  }
  if (orgIds.length === 1) return orgIds[0]
  if (orgIds.length === 0) throw noAccess('organization')

  // The ids stay verbatim in this sentence. Clients parse them out of it (there
  // was no organization_list tool until now), so decorating with names must not
  // change the id format or spacing.
  throw new ToolError(
    'invalid_input',
    `You belong to ${orgs.length} organizations, so this call is ambiguous.`,
    `Pass organization_id. Available: ${orgs.map((o) => `${o.name} (${o.id})`).join(', ')}.`,
  )
}
