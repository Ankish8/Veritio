/**
 * Permission Service Tests
 *
 * Tests the role-based access control (RBAC) logic for the collaboration system.
 * Includes tests for:
 * - Role hierarchy and level comparisons
 * - Permission flag calculations
 * - Organization, project, and study permission checks
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  ROLE_LEVELS,
  calculatePermissions,
  hasRequiredRole,
  getHighestRole,
  type OrganizationRole,
} from '../../lib/supabase/collaboration-types'

// ============================================================================
// ROLE HIERARCHY TESTS (Pure Functions)
// ============================================================================

describe('Role Hierarchy', () => {
  describe('ROLE_LEVELS', () => {
    it('should define correct numeric levels for each role', () => {
      expect(ROLE_LEVELS.owner).toBe(5)
      expect(ROLE_LEVELS.admin).toBe(4)
      expect(ROLE_LEVELS.manager).toBe(3)
      expect(ROLE_LEVELS.editor).toBe(2)
      expect(ROLE_LEVELS.viewer).toBe(1)
    })

    it('should have owner as highest level', () => {
      const roles = ['viewer', 'editor', 'admin', 'owner'] as OrganizationRole[]
      const levels = roles.map((r) => ROLE_LEVELS[r])
      expect(Math.max(...levels)).toBe(ROLE_LEVELS.owner)
    })

    it('should have viewer as lowest level', () => {
      const roles = ['viewer', 'editor', 'admin', 'owner'] as OrganizationRole[]
      const levels = roles.map((r) => ROLE_LEVELS[r])
      expect(Math.min(...levels)).toBe(ROLE_LEVELS.viewer)
    })
  })

  describe('hasRequiredRole', () => {
    // Owner can do everything
    it('should allow owner to access owner-level resources', () => {
      expect(hasRequiredRole('owner', 'owner')).toBe(true)
    })

    it('should allow owner to access admin-level resources', () => {
      expect(hasRequiredRole('owner', 'admin')).toBe(true)
    })

    it('should allow owner to access editor-level resources', () => {
      expect(hasRequiredRole('owner', 'editor')).toBe(true)
    })

    it('should allow owner to access viewer-level resources', () => {
      expect(hasRequiredRole('owner', 'viewer')).toBe(true)
    })

    // Admin permissions
    it('should deny admin access to owner-level resources', () => {
      expect(hasRequiredRole('admin', 'owner')).toBe(false)
    })

    it('should allow admin to access admin-level resources', () => {
      expect(hasRequiredRole('admin', 'admin')).toBe(true)
    })

    it('should allow admin to access editor-level resources', () => {
      expect(hasRequiredRole('admin', 'editor')).toBe(true)
    })

    it('should allow admin to access viewer-level resources', () => {
      expect(hasRequiredRole('admin', 'viewer')).toBe(true)
    })

    // Editor permissions
    it('should deny editor access to owner-level resources', () => {
      expect(hasRequiredRole('editor', 'owner')).toBe(false)
    })

    it('should deny editor access to admin-level resources', () => {
      expect(hasRequiredRole('editor', 'admin')).toBe(false)
    })

    it('should allow editor to access editor-level resources', () => {
      expect(hasRequiredRole('editor', 'editor')).toBe(true)
    })

    it('should allow editor to access viewer-level resources', () => {
      expect(hasRequiredRole('editor', 'viewer')).toBe(true)
    })

    // Viewer permissions (most restrictive)
    it('should deny viewer access to owner-level resources', () => {
      expect(hasRequiredRole('viewer', 'owner')).toBe(false)
    })

    it('should deny viewer access to admin-level resources', () => {
      expect(hasRequiredRole('viewer', 'admin')).toBe(false)
    })

    it('should deny viewer access to editor-level resources', () => {
      expect(hasRequiredRole('viewer', 'editor')).toBe(false)
    })

    it('should allow viewer to access viewer-level resources', () => {
      expect(hasRequiredRole('viewer', 'viewer')).toBe(true)
    })
  })

  describe('getHighestRole', () => {
    it('should return owner when owner is in the list', () => {
      expect(getHighestRole(['viewer', 'editor', 'owner'])).toBe('owner')
      expect(getHighestRole(['owner', 'viewer'])).toBe('owner')
      expect(getHighestRole(['admin', 'owner', 'editor'])).toBe('owner')
    })

    it('should return admin when admin is highest', () => {
      expect(getHighestRole(['viewer', 'editor', 'admin'])).toBe('admin')
      expect(getHighestRole(['admin', 'viewer'])).toBe('admin')
    })

    it('should return editor when editor is highest', () => {
      expect(getHighestRole(['viewer', 'editor'])).toBe('editor')
      expect(getHighestRole(['editor'])).toBe('editor')
    })

    it('should return viewer when viewer is only role', () => {
      expect(getHighestRole(['viewer'])).toBe('viewer')
    })

    it('should return viewer for empty array', () => {
      expect(getHighestRole([])).toBe('viewer')
    })

    it('should handle duplicate roles', () => {
      expect(getHighestRole(['editor', 'editor', 'viewer'])).toBe('editor')
    })
  })
})

// ============================================================================
// PERMISSION FLAGS TESTS (Pure Functions)
// ============================================================================

describe('Permission Flags', () => {
  describe('calculatePermissions', () => {
    it('should grant all permissions to owner', () => {
      const perms = calculatePermissions('owner')
      expect(perms.canView).toBe(true)
      expect(perms.canComment).toBe(true)
      expect(perms.canEdit).toBe(true)
      expect(perms.canManage).toBe(true)
      expect(perms.canDelete).toBe(true)
      expect(perms.canInvite).toBe(true)
    })

    it('should grant management permissions to admin (not delete)', () => {
      const perms = calculatePermissions('admin')
      expect(perms.canView).toBe(true)
      expect(perms.canComment).toBe(true)
      expect(perms.canEdit).toBe(true)
      expect(perms.canManage).toBe(true)
      expect(perms.canDelete).toBe(false)
      expect(perms.canInvite).toBe(true)
    })

    it('should grant edit permissions to editor (not manage)', () => {
      const perms = calculatePermissions('editor')
      expect(perms.canView).toBe(true)
      expect(perms.canComment).toBe(true)
      expect(perms.canEdit).toBe(true)
      expect(perms.canManage).toBe(false)
      expect(perms.canDelete).toBe(false)
      expect(perms.canInvite).toBe(false)
    })

    it('should grant only view permission to viewer', () => {
      const perms = calculatePermissions('viewer')
      expect(perms.canView).toBe(true)
      expect(perms.canComment).toBe(false)
      expect(perms.canEdit).toBe(false)
      expect(perms.canManage).toBe(false)
      expect(perms.canDelete).toBe(false)
      expect(perms.canInvite).toBe(false)
    })
  })
})

// ============================================================================
// PERMISSION SERVICE TESTS (With Mocked Supabase)
// ============================================================================

// Mock Supabase client factory
const createMockSupabase = () => {
  const mockFrom = vi.fn()

  return {
    from: mockFrom,
    _mockFrom: mockFrom, // Expose for test assertions
  }
}

// Helper to chain Supabase query methods
const createQueryChain = (finalResult: { data: unknown; error: unknown }) => {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {}

  chain.select = vi.fn().mockReturnValue(chain)
  chain.eq = vi.fn().mockReturnValue(chain)
  chain.in = vi.fn().mockReturnValue(chain)
  chain.not = vi.fn().mockReturnValue(chain)
  chain.single = vi.fn().mockResolvedValue(finalResult)

  return chain
}

describe('Permission Service', () => {
  // Import the actual service functions (lazy import to allow mocking)
  let getOrganizationRole: typeof import('../permission-service').getOrganizationRole
  let checkOrganizationPermission: typeof import('../permission-service').checkOrganizationPermission
  let getProjectPermission: typeof import('../permission-service').getProjectPermission
  let checkProjectPermission: typeof import('../permission-service').checkProjectPermission
  let getStudyPermission: typeof import('../permission-service').getStudyPermission
  let checkStudyPermission: typeof import('../permission-service').checkStudyPermission

  beforeEach(async () => {
    vi.resetModules()
    const mod = await import('../permission-service')
    getOrganizationRole = mod.getOrganizationRole
    checkOrganizationPermission = mod.checkOrganizationPermission
    getProjectPermission = mod.getProjectPermission
    checkProjectPermission = mod.checkProjectPermission
    getStudyPermission = mod.getStudyPermission
    checkStudyPermission = mod.checkStudyPermission
  })

  describe('getOrganizationRole', () => {
    it('should return user role when membership exists', async () => {
      const mockSupabase = createMockSupabase()
      const queryChain = createQueryChain({ data: { role: 'admin' }, error: null })
      mockSupabase.from.mockReturnValue(queryChain)

      const result = await getOrganizationRole(
        mockSupabase as any,
        'org-123',
        'user-456'
      )

      expect(result.data).toBe('admin')
      expect(result.error).toBeNull()
      expect(mockSupabase.from).toHaveBeenCalledWith('organization_members')
    })

    it('should return null when user is not a member', async () => {
      const mockSupabase = createMockSupabase()
      const queryChain = createQueryChain({
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' },
      })
      mockSupabase.from.mockReturnValue(queryChain)

      const result = await getOrganizationRole(
        mockSupabase as any,
        'org-123',
        'user-456'
      )

      expect(result.data).toBeNull()
      expect(result.error).toBeNull()
    })

    it('should return error for database failures', async () => {
      const mockSupabase = createMockSupabase()
      const queryChain = createQueryChain({
        data: null,
        error: { code: 'PGRST500', message: 'Database error' },
      })
      mockSupabase.from.mockReturnValue(queryChain)

      const result = await getOrganizationRole(
        mockSupabase as any,
        'org-123',
        'user-456'
      )

      expect(result.data).toBeNull()
      expect(result.error).toBeInstanceOf(Error)
      expect(result.error?.message).toBe('Database error')
    })
  })

  describe('checkOrganizationPermission', () => {
    it('should allow access when user has sufficient role', async () => {
      const mockSupabase = createMockSupabase()
      const queryChain = createQueryChain({ data: { role: 'admin' }, error: null })
      mockSupabase.from.mockReturnValue(queryChain)

      const result = await checkOrganizationPermission(
        mockSupabase as any,
        'org-123',
        'user-456',
        'editor' // admin >= editor
      )

      expect(result.allowed).toBe(true)
      expect(result.userRole).toBe('admin')
      expect(result.error).toBeNull()
    })

    it('should deny access when user role is insufficient', async () => {
      const mockSupabase = createMockSupabase()
      const queryChain = createQueryChain({ data: { role: 'viewer' }, error: null })
      mockSupabase.from.mockReturnValue(queryChain)

      const result = await checkOrganizationPermission(
        mockSupabase as any,
        'org-123',
        'user-456',
        'editor' // viewer < editor
      )

      expect(result.allowed).toBe(false)
      expect(result.userRole).toBe('viewer')
      expect(result.error).toBeNull()
    })

    it('should deny access when user is not a member', async () => {
      const mockSupabase = createMockSupabase()
      const queryChain = createQueryChain({
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' },
      })
      mockSupabase.from.mockReturnValue(queryChain)

      const result = await checkOrganizationPermission(
        mockSupabase as any,
        'org-123',
        'user-456',
        'viewer'
      )

      expect(result.allowed).toBe(false)
      expect(result.userRole).toBeNull()
      expect(result.error).toBeNull()
    })
  })

  describe('getProjectPermission', () => {
    it('should return owner permission for legacy project owner', async () => {
      const mockSupabase = createMockSupabase()
      // First call: get project (legacy, no organization_id)
      const projectChain = createQueryChain({
        data: { id: 'proj-123', organization_id: null, user_id: 'user-456', visibility: 'private' },
        error: null,
      })
      mockSupabase.from.mockReturnValueOnce(projectChain)

      const result = await getProjectPermission(
        mockSupabase as any,
        'proj-123',
        'user-456' // Same as project owner
      )

      expect(result.data?.role).toBe('owner')
      expect(result.data?.source).toBe('explicit')
      expect(result.error).toBeNull()
    })

    it('should return null for non-owner of legacy project', async () => {
      const mockSupabase = createMockSupabase()
      const projectChain = createQueryChain({
        data: { id: 'proj-123', organization_id: null, user_id: 'other-user', visibility: 'private' },
        error: null,
      })
      mockSupabase.from.mockReturnValueOnce(projectChain)

      const result = await getProjectPermission(
        mockSupabase as any,
        'proj-123',
        'user-456' // Different user
      )

      expect(result.data).toBeNull()
      expect(result.error).toBeNull()
    })

    it('should return error when project not found', async () => {
      const mockSupabase = createMockSupabase()
      const projectChain = createQueryChain({
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' },
      })
      mockSupabase.from.mockReturnValueOnce(projectChain)

      const result = await getProjectPermission(
        mockSupabase as any,
        'proj-123',
        'user-456'
      )

      expect(result.data).toBeNull()
      expect(result.error?.message).toBe('Project not found')
    })
  })

  describe('checkProjectPermission', () => {
    it('should allow editor to access editor-level resources', async () => {
      const mockSupabase = createMockSupabase()
      // Mock project query
      const projectChain = createQueryChain({
        data: { id: 'proj-123', organization_id: null, user_id: 'user-456', visibility: 'private' },
        error: null,
      })
      mockSupabase.from.mockReturnValueOnce(projectChain)

      const result = await checkProjectPermission(
        mockSupabase as any,
        'proj-123',
        'user-456', // Owner of legacy project
        'editor'
      )

      expect(result.allowed).toBe(true)
      expect(result.userRole).toBe('owner')
    })

    it('should deny access for non-member', async () => {
      const mockSupabase = createMockSupabase()
      // Mock project query (has org, user not owner)
      const projectChain = createQueryChain({
        data: { id: 'proj-123', organization_id: 'org-789', user_id: 'other-user', visibility: 'private' },
        error: null,
      })
      mockSupabase.from.mockReturnValueOnce(projectChain)

      // Mock project_members query (no explicit membership)
      const projectMemberChain = createQueryChain({
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' },
      })
      mockSupabase.from.mockReturnValueOnce(projectMemberChain)

      // Mock organization_members query (not a member)
      const orgMemberChain = createQueryChain({
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' },
      })
      mockSupabase.from.mockReturnValueOnce(orgMemberChain)

      const result = await checkProjectPermission(
        mockSupabase as any,
        'proj-123',
        'user-456',
        'viewer'
      )

      expect(result.allowed).toBe(false)
      expect(result.userRole).toBeNull()
    })
  })

  describe('getStudyPermission', () => {
    it('should inherit permission from parent project', async () => {
      const mockSupabase = createMockSupabase()

      // Mock study query
      const studyChain = createQueryChain({
        data: { id: 'study-123', project_id: 'proj-456', user_id: 'user-789' },
        error: null,
      })
      mockSupabase.from.mockReturnValueOnce(studyChain)

      // Mock project query
      const projectChain = createQueryChain({
        data: { id: 'proj-456', organization_id: null, user_id: 'user-789', visibility: 'private' },
        error: null,
      })
      mockSupabase.from.mockReturnValueOnce(projectChain)

      const result = await getStudyPermission(
        mockSupabase as any,
        'study-123',
        'user-789' // Same as project owner
      )

      expect(result.data?.role).toBe('owner')
      expect(result.data?.studyId).toBe('study-123')
      expect(result.data?.projectId).toBe('proj-456')
    })

    it('should return error when study not found', async () => {
      const mockSupabase = createMockSupabase()
      const studyChain = createQueryChain({
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' },
      })
      mockSupabase.from.mockReturnValueOnce(studyChain)

      const result = await getStudyPermission(
        mockSupabase as any,
        'study-123',
        'user-456'
      )

      expect(result.data).toBeNull()
      expect(result.error?.message).toBe('Study not found')
    })
  })

  describe('checkStudyPermission', () => {
    it('should allow access when user has project permission', async () => {
      const mockSupabase = createMockSupabase()

      // Mock study query
      const studyChain = createQueryChain({
        data: { id: 'study-123', project_id: 'proj-456', user_id: 'user-789' },
        error: null,
      })
      mockSupabase.from.mockReturnValueOnce(studyChain)

      // Mock project query (legacy project)
      const projectChain = createQueryChain({
        data: { id: 'proj-456', organization_id: null, user_id: 'user-789', visibility: 'private' },
        error: null,
      })
      mockSupabase.from.mockReturnValueOnce(projectChain)

      const result = await checkStudyPermission(
        mockSupabase as any,
        'study-123',
        'user-789',
        'editor'
      )

      expect(result.allowed).toBe(true)
      expect(result.userRole).toBe('owner')
    })

    it('should deny access when user lacks project permission', async () => {
      const mockSupabase = createMockSupabase()

      // Mock study query
      const studyChain = createQueryChain({
        data: { id: 'study-123', project_id: 'proj-456', user_id: 'other-user' },
        error: null,
      })
      mockSupabase.from.mockReturnValueOnce(studyChain)

      // Mock project query (legacy project, different owner)
      const projectChain = createQueryChain({
        data: { id: 'proj-456', organization_id: null, user_id: 'other-user', visibility: 'private' },
        error: null,
      })
      mockSupabase.from.mockReturnValueOnce(projectChain)

      const result = await checkStudyPermission(
        mockSupabase as any,
        'study-123',
        'user-789',
        'viewer'
      )

      expect(result.allowed).toBe(false)
      expect(result.userRole).toBeNull()
    })
  })
})

// ============================================================================
// MIDDLEWARE TESTS
// ============================================================================

describe('Permission Middleware', () => {
  describe('Resource ID Extractors', () => {
    // Test the extractor functions from permissions.middleware.ts
    let fromParams: typeof import('../../middlewares/permissions.middleware').fromParams
    let fromBody: typeof import('../../middlewares/permissions.middleware').fromBody
    let firstOf: typeof import('../../middlewares/permissions.middleware').firstOf

    beforeEach(async () => {
      vi.resetModules()
      const mod = await import('../../middlewares/permissions.middleware')
      fromParams = mod.fromParams
      fromBody = mod.fromBody
      firstOf = mod.firstOf
    })

    describe('fromParams', () => {
      it('should extract resource ID from URL params', () => {
        const extractor = fromParams('projectId')
        const req = { params: { projectId: 'proj-123' } }
        expect(extractor(req)).toBe('proj-123')
      })

      it('should return null when param is missing', () => {
        const extractor = fromParams('projectId')
        const req = { params: {} }
        expect(extractor(req)).toBeNull()
      })

      it('should return null when params is undefined', () => {
        const extractor = fromParams('projectId')
        const req = {}
        expect(extractor(req)).toBeNull()
      })
    })

    describe('fromBody', () => {
      it('should extract resource ID from request body', () => {
        const extractor = fromBody('organizationId')
        const req = { body: { organizationId: 'org-456' } }
        expect(extractor(req)).toBe('org-456')
      })

      it('should return null when field is missing', () => {
        const extractor = fromBody('organizationId')
        const req = { body: {} }
        expect(extractor(req)).toBeNull()
      })

      it('should return null for non-string values', () => {
        const extractor = fromBody('organizationId')
        const req = { body: { organizationId: 123 } }
        expect(extractor(req)).toBeNull()
      })

      it('should return null when body is undefined', () => {
        const extractor = fromBody('organizationId')
        const req = {}
        expect(extractor(req)).toBeNull()
      })
    })

    describe('firstOf', () => {
      it('should return first non-null result', () => {
        const extractor = firstOf(
          fromParams('id'),
          fromBody('projectId')
        )
        // Body has value, params doesn't
        const req = { params: {}, body: { projectId: 'proj-789' } }
        expect(extractor(req)).toBe('proj-789')
      })

      it('should prefer params over body', () => {
        const extractor = firstOf(
          fromParams('id'),
          fromBody('id')
        )
        const req = { params: { id: 'from-params' }, body: { id: 'from-body' } }
        expect(extractor(req)).toBe('from-params')
      })

      it('should return null when all extractors return null', () => {
        const extractor = firstOf(
          fromParams('missingParam'),
          fromBody('missingField')
        )
        const req = { params: {}, body: {} }
        expect(extractor(req)).toBeNull()
      })
    })
  })
})
