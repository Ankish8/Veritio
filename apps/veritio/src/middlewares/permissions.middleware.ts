/**
 * Permission Middleware
 *
 * Reusable middleware for checking user permissions on resources.
 * Supports organization, project, and study level permission checks.
 *
 * Usage in API steps:
 *   middleware: [authMiddleware, requireProjectEditor('projectId'), errorHandlerMiddleware]
 *
 * The middleware extracts resource IDs from URL params or request body,
 * checks the user's permission, and either continues or returns 403.
 */

import { ApiMiddleware } from 'motia'
import { getMotiaSupabaseClient } from '../lib/supabase/motia-client'
import {
  checkOrganizationPermission,
  checkProjectPermission,
  checkStudyPermission,
  checkResponsePermission,
  type OrganizationRole,
} from '../services/permission-service'

// Permission check cache (short TTL to balance performance and freshness)
const permissionCache = new Map<string, { allowed: boolean; role: OrganizationRole | null; expiresAt: number }>()
const CACHE_TTL = 30 * 1000 // 30 seconds

/**
 * Clear expired cache entries
 */
function cleanCache(): void {
  const now = Date.now()
  for (const [key, value] of permissionCache.entries()) {
    if (value.expiresAt < now) {
      permissionCache.delete(key)
    }
  }
}

/**
 * Get cached permission or null if not cached/expired
 */
function getCachedPermission(cacheKey: string): { allowed: boolean; role: OrganizationRole | null } | null {
  const cached = permissionCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) {
    return { allowed: cached.allowed, role: cached.role }
  }
  return null
}

/**
 * Cache a permission check result
 */
function cachePermission(cacheKey: string, allowed: boolean, role: OrganizationRole | null): void {
  permissionCache.set(cacheKey, {
    allowed,
    role,
    expiresAt: Date.now() + CACHE_TTL,
  })

  // Periodically clean up old entries
  if (permissionCache.size > 500) {
    cleanCache()
  }
}

// ============================================================================
// RESOURCE ID EXTRACTORS
// ============================================================================

type ResourceIdExtractor = (req: { pathParams?: Record<string, string>; params?: Record<string, string>; body?: unknown }) => string | null

/**
 * Extract resource ID from URL params (supports both Motia's pathParams and params)
 */
function fromParams(paramName: string): ResourceIdExtractor {
  return (req) => req.pathParams?.[paramName] || req.params?.[paramName] || null
}

/**
 * Extract resource ID from request body
 */
function fromBody(fieldName: string): ResourceIdExtractor {
  return (req) => {
    const body = req.body as Record<string, unknown> | undefined
    const value = body?.[fieldName]
    return typeof value === 'string' ? value : null
  }
}

/**
 * Try multiple extractors in order, return first non-null result
 */
function firstOf(...extractors: ResourceIdExtractor[]): ResourceIdExtractor {
  return (req) => {
    for (const extractor of extractors) {
      const value = extractor(req)
      if (value) return value
    }
    return null
  }
}

// ============================================================================
// MIDDLEWARE FACTORIES
// ============================================================================

export type ResourceType = 'organization' | 'project' | 'study' | 'response'

interface PermissionMiddlewareOptions {
  /** Where to find the resource ID */
  resourceIdExtractor: ResourceIdExtractor
  /** Minimum required role */
  requiredRole: OrganizationRole
  /** Custom error message */
  errorMessage?: string
  /** Whether to attach permission context to request for downstream use */
  attachContext?: boolean
}

/**
 * Create a permission-checking middleware for any resource type
 */
function createPermissionMiddleware(
  resourceType: ResourceType,
  options: PermissionMiddlewareOptions
): ApiMiddleware {
  const {
    resourceIdExtractor,
    requiredRole,
    errorMessage = `Permission denied: ${requiredRole} role required`,
    attachContext = true,
  } = options

  return async (req, ctx, next) => {
    const { logger } = ctx
    const userId = req.headers['x-user-id'] as string

    if (!userId) {
      logger.warn('Permission check failed: no user ID')
      return {
        status: 401,
        body: { error: 'Authentication required' },
      }
    }

    const resourceId = resourceIdExtractor(req)
    if (!resourceId) {
      logger.warn('Permission check failed: resource ID not found', { resourceType })
      return {
        status: 400,
        body: { error: `${resourceType} ID is required` },
      }
    }

    // Check cache first
    const cacheKey = `${resourceType}:${resourceId}:${userId}:${requiredRole}`
    const cached = getCachedPermission(cacheKey)

    if (cached !== null) {
      if (!cached.allowed) {
        return {
          status: 403,
          body: { error: errorMessage },
        }
      }
      if (attachContext) {
        req.headers['x-user-role'] = cached.role || 'viewer'
        req.headers['x-resource-id'] = resourceId
        req.headers['x-resource-type'] = resourceType
      }
      return await next()
    }

    // Perform permission check
    const supabase = getMotiaSupabaseClient()
    let result: { allowed: boolean; userRole: OrganizationRole | null; error: Error | null }

    try {
      switch (resourceType) {
        case 'organization':
          result = await checkOrganizationPermission(supabase, resourceId, userId, requiredRole)
          break
        case 'project':
          result = await checkProjectPermission(supabase, resourceId, userId, requiredRole)
          break
        case 'study':
          result = await checkStudyPermission(supabase, resourceId, userId, requiredRole)
          break
        case 'response':
          result = await checkResponsePermission(supabase, resourceId, userId, requiredRole)
          break
        default:
          logger.error('Unknown resource type', { resourceType })
          return {
            status: 500,
            body: { error: 'Internal server error' },
          }
      }
    } catch (error) {
      logger.error('Permission check error', { resourceType, resourceId, error })
      return {
        status: 500,
        body: { error: 'Failed to check permissions' },
      }
    }

    if (result.error) {
      logger.error('Permission check failed', { error: result.error.message })
      return {
        status: 500,
        body: { error: 'Failed to check permissions' },
      }
    }

    // Cache the result
    cachePermission(cacheKey, result.allowed, result.userRole)

    if (!result.allowed) {
      logger.info('Permission denied', {
        resourceType,
        resourceId,
        userId,
        requiredRole,
        userRole: result.userRole,
      })
      return {
        status: 403,
        body: { error: errorMessage },
      }
    }

    // Attach context for downstream handlers
    if (attachContext) {
      req.headers['x-user-role'] = result.userRole || 'viewer'
      req.headers['x-resource-id'] = resourceId
      req.headers['x-resource-type'] = resourceType
    }

    return await next()
  }
}

// ============================================================================
// CONVENIENCE MIDDLEWARE GENERATORS
// ============================================================================

/**
 * Require viewer+ role on an organization
 * @param paramName - URL param name containing org ID (default: 'id')
 */
export function requireOrgViewer(paramName = 'id'): ApiMiddleware {
  return createPermissionMiddleware('organization', {
    resourceIdExtractor: firstOf(fromParams(paramName), fromBody('organizationId')),
    requiredRole: 'viewer',
    errorMessage: 'Access denied: you are not a member of this organization',
  })
}

/**
 * Require editor+ role on an organization
 */
export function requireOrgEditor(paramName = 'id'): ApiMiddleware {
  return createPermissionMiddleware('organization', {
    resourceIdExtractor: firstOf(fromParams(paramName), fromBody('organizationId')),
    requiredRole: 'editor',
    errorMessage: 'Permission denied: editor role required',
  })
}

/**
 * Require manager+ role on an organization (can create/launch studies, create projects)
 */
export function requireOrgManager(paramName = 'id'): ApiMiddleware {
  return createPermissionMiddleware('organization', {
    resourceIdExtractor: firstOf(fromParams(paramName), fromBody('organizationId')),
    requiredRole: 'manager',
    errorMessage: 'Permission denied: manager role required',
  })
}

/**
 * Require admin+ role on an organization
 */
export function requireOrgAdmin(paramName = 'id'): ApiMiddleware {
  return createPermissionMiddleware('organization', {
    resourceIdExtractor: firstOf(fromParams(paramName), fromBody('organizationId')),
    requiredRole: 'admin',
    errorMessage: 'Permission denied: admin role required',
  })
}

/**
 * Require owner role on an organization
 */
export function requireOrgOwner(paramName = 'id'): ApiMiddleware {
  return createPermissionMiddleware('organization', {
    resourceIdExtractor: firstOf(fromParams(paramName), fromBody('organizationId')),
    requiredRole: 'owner',
    errorMessage: 'Permission denied: owner role required',
  })
}

/**
 * Require viewer+ role on a project
 * @param paramName - URL param name containing project ID (default: 'projectId')
 */
export function requireProjectViewer(paramName = 'projectId'): ApiMiddleware {
  return createPermissionMiddleware('project', {
    resourceIdExtractor: firstOf(fromParams(paramName), fromBody('projectId')),
    requiredRole: 'viewer',
    errorMessage: 'Access denied: you do not have access to this project',
  })
}

/**
 * Require editor+ role on a project
 */
export function requireProjectEditor(paramName = 'projectId'): ApiMiddleware {
  return createPermissionMiddleware('project', {
    resourceIdExtractor: firstOf(fromParams(paramName), fromBody('projectId')),
    requiredRole: 'editor',
    errorMessage: 'Permission denied: editor role required for this project',
  })
}

/**
 * Require manager+ role on a project (can create/launch studies)
 */
export function requireProjectManager(paramName = 'projectId'): ApiMiddleware {
  return createPermissionMiddleware('project', {
    resourceIdExtractor: firstOf(fromParams(paramName), fromBody('projectId')),
    requiredRole: 'manager',
    errorMessage: 'Permission denied: manager role required for this project',
  })
}

/**
 * Require admin+ role on a project
 */
export function requireProjectAdmin(paramName = 'projectId'): ApiMiddleware {
  return createPermissionMiddleware('project', {
    resourceIdExtractor: firstOf(fromParams(paramName), fromBody('projectId')),
    requiredRole: 'admin',
    errorMessage: 'Permission denied: admin role required for this project',
  })
}

/**
 * Require viewer+ role on a study
 * @param paramName - URL param name containing study ID (default: 'studyId')
 */
export function requireStudyViewer(paramName = 'studyId'): ApiMiddleware {
  return createPermissionMiddleware('study', {
    resourceIdExtractor: firstOf(fromParams(paramName), fromBody('studyId')),
    requiredRole: 'viewer',
    errorMessage: 'Access denied: you do not have access to this study',
  })
}

/**
 * Require editor+ role on a study
 */
export function requireStudyEditor(paramName = 'studyId'): ApiMiddleware {
  return createPermissionMiddleware('study', {
    resourceIdExtractor: firstOf(fromParams(paramName), fromBody('studyId')),
    requiredRole: 'editor',
    errorMessage: 'Permission denied: editor role required for this study',
  })
}

/**
 * Require manager+ role on a study (can launch/close, delete)
 */
export function requireStudyManager(paramName = 'studyId'): ApiMiddleware {
  return createPermissionMiddleware('study', {
    resourceIdExtractor: firstOf(fromParams(paramName), fromBody('studyId')),
    requiredRole: 'manager',
    errorMessage: 'Permission denied: manager role required for this study',
  })
}

/**
 * Require admin+ role on a study
 */
export function requireStudyAdmin(paramName = 'studyId'): ApiMiddleware {
  return createPermissionMiddleware('study', {
    resourceIdExtractor: firstOf(fromParams(paramName), fromBody('studyId')),
    requiredRole: 'admin',
    errorMessage: 'Permission denied: admin role required for this study',
  })
}

/**
 * Require viewer+ access to the study that owns a response.
 * Resolves the polymorphic responseId to its study, then checks study permission.
 * @param paramName - URL param name containing the response ID (default: 'responseId')
 */
export function requireResponseViewer(paramName = 'responseId'): ApiMiddleware {
  return createPermissionMiddleware('response', {
    resourceIdExtractor: firstOf(fromParams(paramName), fromBody('response_id'), fromBody('responseId')),
    requiredRole: 'viewer',
    errorMessage: 'Access denied: you do not have access to this response',
  })
}

/**
 * Require editor+ access to the study that owns a response (assign/remove tags, etc.)
 */
export function requireResponseEditor(paramName = 'responseId'): ApiMiddleware {
  return createPermissionMiddleware('response', {
    resourceIdExtractor: firstOf(fromParams(paramName), fromBody('response_id'), fromBody('responseId')),
    requiredRole: 'editor',
    errorMessage: 'Permission denied: editor role required for this response',
  })
}

// ============================================================================
// PANEL PERMISSION MIDDLEWARE
// ============================================================================
// Panel resources (participants, tags, segments, notes) are organization-scoped,
// but their ids are NOT org/project/study ids and historically the org id came
// from a client-supplied query param (untrusted). These middlewares resolve the
// resource to its OWNING organization from the DB, verify org membership, and
// overwrite req.queryParams.organizationId with the verified value so downstream
// handlers/services cannot be tricked by a forged organizationId.

type PanelResourceKind = 'participant' | 'tag' | 'segment' | 'note'

async function resolvePanelOrgId(supabase: any, kind: PanelResourceKind, id: string): Promise<string | null> {
  if (kind === 'note') {
    // Notes have no org column — resolve via their participant.
    const { data: note } = await supabase
      .from('panel_participant_notes')
      .select('panel_participant_id')
      .eq('id', id)
      .maybeSingle()
    if (!note?.panel_participant_id) return null
    const { data: participant } = await supabase
      .from('panel_participants')
      .select('organization_id')
      .eq('id', note.panel_participant_id)
      .maybeSingle()
    return participant?.organization_id ?? null
  }
  const table = kind === 'participant' ? 'panel_participants' : kind === 'tag' ? 'panel_tags' : 'panel_segments'
  const { data } = await supabase.from(table).select('organization_id').eq('id', id).maybeSingle()
  return data?.organization_id ?? null
}

/**
 * Require org membership on the organization that OWNS a panel resource.
 * Resolves the resource (participant/tag/segment/note) to its organization_id
 * from the DB, checks the caller's org role, and pins the verified org id onto
 * the request. The client-supplied organizationId query param is not trusted.
 */
export function requirePanelAccess(
  kind: PanelResourceKind,
  requiredRole: OrganizationRole,
  paramName?: string
): ApiMiddleware {
  const param =
    paramName ??
    (kind === 'note' ? 'noteId' : kind === 'tag' ? 'tagId' : kind === 'segment' ? 'segmentId' : 'participantId')
  return async (req, ctx, next) => {
    const { logger } = ctx
    const userId = req.headers['x-user-id'] as string
    if (!userId) {
      return { status: 401, body: { error: 'Authentication required' } }
    }
    const resourceId = (req.pathParams?.[param] || (req as any).params?.[param]) as string | undefined
    if (!resourceId) {
      return { status: 400, body: { error: `${param} is required` } }
    }

    const supabase = getMotiaSupabaseClient()
    let orgId: string | null
    try {
      orgId = await resolvePanelOrgId(supabase, kind, resourceId)
    } catch (error) {
      logger.error('Panel permission resolve error', { kind, resourceId, error })
      return { status: 500, body: { error: 'Failed to check permissions' } }
    }
    if (!orgId) {
      // Resource does not exist (or was deleted) — do not leak existence.
      return { status: 404, body: { error: 'Not found' } }
    }

    const { allowed, error } = await checkOrganizationPermission(supabase, orgId, userId, requiredRole)
    if (error) {
      logger.error('Panel permission check error', { kind, orgId, error: error.message })
      return { status: 500, body: { error: 'Failed to check permissions' } }
    }
    if (!allowed) {
      return { status: 403, body: { error: 'Access denied: you are not a member of this organization' } }
    }

    // Pin the verified org id; never trust the client-supplied query param.
    const r = req as any
    if (!r.queryParams) r.queryParams = {}
    r.queryParams.organizationId = orgId
    req.headers['x-panel-org-id'] = orgId
    return next()
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  createPermissionMiddleware,
  fromParams,
  fromBody,
  firstOf,
  type PermissionMiddlewareOptions,
  type ResourceIdExtractor,
}
