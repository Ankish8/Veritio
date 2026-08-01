/**
 * The authorization gate every MCP tool passes through.
 *
 * Why this exists, stated plainly: the backend runs on a service-role Supabase
 * client, so RLS is bypassed and *all* authorization is application-level. The
 * assistant tool layer in `services/assistant/` performs none of it — the chat
 * step checks org membership once at the front door and every subsequent tool
 * call runs unchecked against that studyId. That is safe for a single
 * server-driven conversation and completely unsafe for MCP, where each tool
 * call is an independent, client-controlled request.
 *
 * So: every call re-resolves and re-authorizes its target resource. The
 * requirement is declared next to the tool rather than written inside the
 * handler, which lets `registry.test.ts` enumerate the registry and prove that
 * no write tool ever ships without one.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { OrganizationRole } from '../../lib/supabase/collaboration-types'
import type { FeatureKey } from '../../lib/plans'
import {
  checkStudyPermission,
  checkProjectPermission,
  checkOrganizationPermission,
} from '../../services/permission-service'
import { assertStudyFeature, assertFeature, getOrgIdForStudy } from '../../services/entitlements-service'
import { EntitlementError } from '../../lib/api/classify-error'
import { needsRole, noAccess, planRequired, insufficientScope } from './errors'
import type { McpScope } from './scopes'

export type ResourceKind = 'study' | 'project' | 'organization'

/**
 * Which resource a tool touches, and at what role.
 *
 * `argKey` names the input field holding the resource id, so the gate can pull
 * it out of validated args without the handler being trusted to do it.
 */
export type ResourceRequirement =
  | { kind: 'none' }
  | { kind: ResourceKind; argKey: string; role: OrganizationRole }

/** Everything a tool handler is allowed to know about its caller. */
export interface ToolContext {
  supabase: SupabaseClient
  userId: string
  scopes: readonly McpScope[]
  /** Resolved id of the authorized resource, when the tool declared one. */
  resourceId?: string
  /** The caller's role on that resource. Handlers may use it to shape output. */
  role?: OrganizationRole
  /** Key id or OAuth client id, for the audit trail. */
  credentialId?: string
}

const CHECKERS: Record<
  ResourceKind,
  (
    supabase: SupabaseClient,
    id: string,
    userId: string,
    role: OrganizationRole,
  ) => Promise<{ allowed: boolean; userRole: OrganizationRole | null; error: Error | null }>
> = {
  // The service signatures are identical in shape but nominally typed to
  // SupabaseClient<Database>; the cast keeps this table uniform.
  study: (s, id, u, r) => checkStudyPermission(s as never, id, u, r),
  project: (s, id, u, r) => checkProjectPermission(s as never, id, u, r),
  organization: (s, id, u, r) => checkOrganizationPermission(s as never, id, u, r),
}

/** Throw unless the credential carries every scope the tool declared. */
export function assertScopes(granted: readonly McpScope[], required: readonly McpScope[]): void {
  for (const scope of required) {
    if (!granted.includes(scope)) throw insufficientScope(scope)
  }
}

/**
 * Resolve and authorize the resource a tool declared.
 *
 * Returns the id and the caller's role so the handler does not re-query.
 * Throws a `ToolError` on any failure — never returns a partial result.
 */
export async function assertResourceAccess(
  supabase: SupabaseClient,
  userId: string,
  requirement: ResourceRequirement,
  args: Record<string, unknown>,
  toolName: string,
): Promise<{ resourceId?: string; role?: OrganizationRole }> {
  if (requirement.kind === 'none') return {}

  const raw = args[requirement.argKey]
  if (typeof raw !== 'string' || raw.length === 0) {
    // A declared requirement whose arg is missing is a programming error in the
    // tool definition, not a user error. Fail closed rather than skipping the check.
    throw noAccess(requirement.kind)
  }

  const { allowed, userRole, error } = await CHECKERS[requirement.kind](
    supabase,
    raw,
    userId,
    requirement.role,
  )

  // A "not found" from the permission service and a genuine denial are
  // deliberately indistinguishable to the caller. See errors.ts.
  if (error) throw noAccess(requirement.kind)
  if (!allowed) {
    if (userRole === null) throw noAccess(requirement.kind)
    throw needsRole(toolName, requirement.role, userRole)
  }

  return { resourceId: raw, role: userRole ?? undefined }
}

/**
 * Plan gating, after the permission check has already passed.
 *
 * Uses the org-level assert directly rather than `assertStudyFeatureForUser`,
 * which would redo the permission check we just did.
 */
export async function assertFeatureAccess(
  supabase: SupabaseClient,
  requirement: ResourceRequirement,
  resourceId: string | undefined,
  feature: FeatureKey,
): Promise<void> {
  try {
    if (requirement.kind === 'study' && resourceId) {
      await assertStudyFeature(supabase as never, resourceId, feature)
      return
    }
    if (requirement.kind === 'organization' && resourceId) {
      await assertFeature(supabase as never, resourceId, feature)
      return
    }
    if (requirement.kind === 'project' && resourceId) {
      // Projects inherit their org's plan; resolve via any study is wrong, so
      // read the project's organization directly.
      const { data } = await supabase
        .from('projects')
        .select('organization_id')
        .eq('id', resourceId)
        .single()
      const orgId = (data as { organization_id?: string | null } | null)?.organization_id
      if (orgId) await assertFeature(supabase as never, orgId, feature)
    }
  } catch (err) {
    if (err instanceof EntitlementError) throw planRequired(feature, err.message)
    throw err
  }
}

/** Resolve the org that owns a study, for audit logging. */
export async function orgIdForStudy(supabase: SupabaseClient, studyId: string): Promise<string | null> {
  return getOrgIdForStudy(supabase as never, studyId)
}
