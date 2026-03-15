/**
 * Collaboration Feature Type Definitions
 *
 * TypeScript types for the multi-tenant collaboration system.
 * These types correspond to the collaboration tables: organizations,
 * organization_members, organization_invitations, project_members,
 * study_comments, and study_share_links.
 */

import { z } from 'zod'

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

/**
 * Role hierarchy (higher value = more permissions):
 * owner (5) > admin (4) > manager (3) > editor (2) > viewer (1)
 *
 * - viewer: Can view projects and results
 * - editor: Can edit existing study content (cards, trees, flow, settings)
 * - manager: Can also create/delete studies, launch/close studies, create projects
 * - admin: Can also manage team members and org settings
 * - owner: Full control including deleting the organization
 */
export const ORGANIZATION_ROLES = ['owner', 'admin', 'manager', 'editor', 'viewer'] as const
export type OrganizationRole = (typeof ORGANIZATION_ROLES)[number]

/** Numeric role levels for permission comparison */
export const ROLE_LEVELS: Record<OrganizationRole, number> = {
  owner: 5,
  admin: 4,
  manager: 3,
  editor: 2,
  viewer: 1,
} as const

/** Roles that can be assigned via invitation (owner is assigned at creation) */
export const INVITE_ASSIGNABLE_ROLES = ['admin', 'manager', 'editor', 'viewer'] as const
export type InviteAssignableRole = (typeof INVITE_ASSIGNABLE_ROLES)[number]

export const INVITE_TYPES = ['email', 'link'] as const
export type InviteType = (typeof INVITE_TYPES)[number]

export const INVITE_STATUSES = ['pending', 'accepted', 'expired', 'revoked'] as const
export type InviteStatus = (typeof INVITE_STATUSES)[number]

export const PROJECT_VISIBILITIES = ['private', 'org_visible'] as const
export type ProjectVisibility = (typeof PROJECT_VISIBILITIES)[number]

export const MEMBER_SOURCES = ['inherited', 'explicit'] as const
export type MemberSource = (typeof MEMBER_SOURCES)[number]

export const ORGANIZATION_TYPES = ['personal', 'team'] as const
export type OrganizationType = (typeof ORGANIZATION_TYPES)[number]

// ============================================================================
// ORGANIZATIONS
// ============================================================================

/**
 * Organization settings stored in JSONB
 */
export interface OrganizationSettings {
  /** Organization type: personal (solo) or team (multi-user) */
  type?: OrganizationType
  /** Brand colors for participant-facing studies */
  branding?: {
    primaryColor?: string
    logoUrl?: string
  }
  /** Future: billing info, feature flags */
  [key: string]: unknown
}

/**
 * Organization entity (teams/workspaces that contain projects)
 */
export interface Organization {
  id: string
  name: string
  slug: string
  avatar_url: string | null
  settings: OrganizationSettings
  is_personal: boolean
  created_by_user_id: string
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface OrganizationInsert {
  name: string
  slug: string
  avatar_url?: string | null
  settings?: OrganizationSettings
  created_by_user_id: string
}

export interface OrganizationUpdate {
  name?: string
  slug?: string
  avatar_url?: string | null
  settings?: OrganizationSettings
}

// Zod schemas
export const createOrganizationSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name too long'),
  slug: z
    .string()
    .min(2, 'Slug must be at least 2 characters')
    .max(63, 'Slug too long')
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens only'),
  avatar_url: z.string().url().nullable().optional(),
  settings: z.record(z.unknown()).optional(),
})

export const updateOrganizationSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  slug: z
    .string()
    .min(2)
    .max(63)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  avatar_url: z.string().url().nullable().optional(),
  settings: z.record(z.unknown()).optional(),
})

// ============================================================================
// ORGANIZATION MEMBERS
// ============================================================================

/**
 * Organization member with role-based access
 */
export interface OrganizationMember {
  id: string
  organization_id: string
  user_id: string
  role: OrganizationRole
  invited_by_user_id: string | null
  invited_at: string | null
  joined_at: string | null
  created_at: string
  updated_at: string
}

export interface OrganizationMemberInsert {
  organization_id: string
  user_id: string
  role: OrganizationRole
  invited_by_user_id?: string | null
  invited_at?: string | null
  joined_at?: string | null
}

export interface OrganizationMemberUpdate {
  role?: OrganizationRole
  joined_at?: string | null
}

// Zod schemas
export const addOrganizationMemberSchema = z.object({
  user_id: z.string().min(1, 'User ID is required'),
  role: z.enum(INVITE_ASSIGNABLE_ROLES),
})

export const updateMemberRoleSchema = z.object({
  role: z.enum(INVITE_ASSIGNABLE_ROLES),
})

// ============================================================================
// ORGANIZATION INVITATIONS
// ============================================================================

/**
 * Organization invitation (email or link-based)
 */
export interface OrganizationInvitation {
  id: string
  organization_id: string
  invite_type: InviteType
  email: string | null
  invite_token: string | null
  max_uses: number | null
  uses_count: number
  role: InviteAssignableRole
  invited_by_user_id: string
  message: string | null
  expires_at: string | null
  status: InviteStatus
  accepted_at: string | null
  accepted_by_user_id: string | null
  created_at: string
  updated_at: string
}

export interface OrganizationInvitationInsert {
  organization_id: string
  invite_type: InviteType
  email?: string | null
  invite_token?: string | null
  max_uses?: number | null
  role: InviteAssignableRole
  invited_by_user_id: string
  message?: string | null
  expires_at?: string | null
}

export interface OrganizationInvitationUpdate {
  status?: InviteStatus
  accepted_at?: string | null
  accepted_by_user_id?: string | null
  uses_count?: number
}

// Zod schemas
export const createEmailInvitationSchema = z.object({
  email: z.string().email('Valid email is required'),
  role: z.enum(INVITE_ASSIGNABLE_ROLES),
  message: z.string().max(500, 'Message too long').optional(),
  expires_in_days: z.number().int().min(1).max(30).optional().default(7),
})

export const createLinkInvitationSchema = z.object({
  role: z.enum(INVITE_ASSIGNABLE_ROLES),
  max_uses: z.number().int().min(1).max(1000).nullable().optional(),
  expires_in_days: z.number().int().min(1).max(90).nullable().optional(),
})

export const acceptInvitationSchema = z.object({
  token: z.string().min(1, 'Invitation token is required'),
})

// ============================================================================
// PROJECT MEMBERS (Permission Overrides)
// ============================================================================

/**
 * Project-level permission override (optional: overrides org role)
 */
export interface ProjectMember {
  id: string
  project_id: string
  user_id: string
  organization_id: string | null
  role: OrganizationRole
  source: MemberSource
  added_by_user_id: string | null
  added_at: string
  created_at: string
  updated_at: string
}

export interface ProjectMemberInsert {
  project_id: string
  user_id: string
  organization_id?: string | null
  role: OrganizationRole
  source?: MemberSource
  added_by_user_id?: string | null
}

export interface ProjectMemberUpdate {
  role?: OrganizationRole
}

// Zod schemas
export const addProjectMemberSchema = z.object({
  user_id: z.string().min(1, 'User ID is required'),
  role: z.enum(ORGANIZATION_ROLES),
})

export const updateProjectMemberRoleSchema = z.object({
  role: z.enum(ORGANIZATION_ROLES),
})

// ============================================================================
// STUDY COMMENTS
// ============================================================================

/**
 * Study-level comment with threading and @mentions
 */
export interface StudyComment {
  id: string
  study_id: string
  author_user_id: string
  content: string
  parent_comment_id: string | null
  thread_position: number
  mentions: string[]
  is_deleted: boolean
  deleted_at: string | null
  deleted_by_user_id: string | null
  edited_at: string | null
  created_at: string
  updated_at: string
}

export interface StudyCommentInsert {
  study_id: string
  author_user_id: string
  content: string
  parent_comment_id?: string | null
  thread_position?: number
  mentions?: string[]
}

export interface StudyCommentUpdate {
  content?: string
  mentions?: string[]
  edited_at?: string
  is_deleted?: boolean
  deleted_at?: string | null
  deleted_by_user_id?: string | null
}

// Zod schemas
export const createCommentSchema = z.object({
  content: z
    .string()
    .min(1, 'Comment cannot be empty')
    .max(10000, 'Comment too long'),
  parent_comment_id: z.string().uuid().nullable().optional(),
})

export const updateCommentSchema = z.object({
  content: z.string().min(1).max(10000),
})

// ============================================================================
// STUDY SHARE LINKS
// ============================================================================

/**
 * Public share link for external stakeholders (view-only, no auth required)
 */
export interface StudyShareLink {
  id: string
  study_id: string
  share_token: string
  password_hash: string | null
  expires_at: string | null
  allow_download: boolean
  allow_comments: boolean
  label: string | null
  created_by_user_id: string
  is_active: boolean
  created_at: string
  updated_at: string
  view_count: number
  last_viewed_at: string | null
}

export interface StudyShareLinkInsert {
  study_id: string
  password_hash?: string | null
  expires_at?: string | null
  allow_download?: boolean
  allow_comments?: boolean
  label?: string | null
  created_by_user_id: string
}

export interface StudyShareLinkUpdate {
  password_hash?: string | null
  expires_at?: string | null
  allow_download?: boolean
  allow_comments?: boolean
  label?: string | null
  is_active?: boolean
  view_count?: number
  last_viewed_at?: string | null
}

// Zod schemas
export const createShareLinkSchema = z.object({
  password: z.string().min(4).max(100).optional(),
  expires_in_days: z.number().int().min(1).max(365).nullable().optional(),
  allow_download: z.boolean().optional().default(false),
  allow_comments: z.boolean().optional().default(false),
  label: z.string().max(100).optional(),
})

export const updateShareLinkSchema = z.object({
  password: z.string().min(4).max(100).nullable().optional(),
  expires_in_days: z.number().int().min(1).max(365).nullable().optional(),
  allow_download: z.boolean().optional(),
  allow_comments: z.boolean().optional(),
  label: z.string().max(100).optional(),
  is_active: z.boolean().optional(),
})

export const validateShareLinkSchema = z.object({
  token: z.string().min(1, 'Share token is required'),
  password: z.string().optional(),
})

// ============================================================================
// PERMISSION CONTEXT & HELPERS
// ============================================================================

/**
 * Permission flags calculated from role
 */
export interface PermissionFlags {
  /** Can view the resource */
  canView: boolean
  /** Can add/edit comments */
  canComment: boolean
  /** Can edit resource content */
  canEdit: boolean
  /** Can create new studies/projects (manager+) */
  canCreate: boolean
  /** Can launch/close studies (manager+) */
  canLaunch: boolean
  /** Can manage settings, members (admin-level) */
  canManage: boolean
  /** Can delete the resource (owner-level) */
  canDelete: boolean
  /** Can invite new members */
  canInvite: boolean
}

/**
 * Full permission context for authorization decisions
 */
export interface PermissionContext {
  userId: string
  organizationId?: string
  projectId?: string
  studyId?: string
  role: OrganizationRole
  source: MemberSource
  permissions: PermissionFlags
}

/**
 * Result from permission views (project_permissions, study_permissions)
 */
export interface ProjectPermissionRow {
  project_id: string
  organization_id: string | null
  user_id: string
  effective_role: OrganizationRole
  source: MemberSource
}

export interface StudyPermissionRow {
  study_id: string
  project_id: string
  organization_id: string | null
  user_id: string
  effective_role: OrganizationRole
  source: MemberSource
}

/**
 * Calculate permission flags from role
 */
export function calculatePermissions(role: OrganizationRole): PermissionFlags {
  const level = ROLE_LEVELS[role]
  return {
    canView: level >= ROLE_LEVELS.viewer,
    canComment: level >= ROLE_LEVELS.editor,
    canEdit: level >= ROLE_LEVELS.editor,
    canCreate: level >= ROLE_LEVELS.manager,
    canLaunch: level >= ROLE_LEVELS.manager,
    canManage: level >= ROLE_LEVELS.admin,
    canDelete: level >= ROLE_LEVELS.owner,
    canInvite: level >= ROLE_LEVELS.admin,
  }
}

/**
 * Check if a role has at least the required permission level
 */
export function hasRequiredRole(
  userRole: OrganizationRole,
  requiredRole: OrganizationRole
): boolean {
  return ROLE_LEVELS[userRole] >= ROLE_LEVELS[requiredRole]
}

/**
 * Get the highest role from multiple roles (e.g., from different sources)
 */
export function getHighestRole(roles: OrganizationRole[]): OrganizationRole {
  if (roles.length === 0) return 'viewer'
  return roles.reduce((highest, role) =>
    ROLE_LEVELS[role] > ROLE_LEVELS[highest] ? role : highest
  )
}

// ============================================================================
// COMPOSITE TYPES (API responses with joins)
// ============================================================================

/**
 * Basic user info for display (from Better Auth user table)
 */
export interface UserInfo {
  id: string
  name: string | null
  email: string
  image: string | null
}

/**
 * Organization with member count and user's role
 */
export interface OrganizationWithMeta extends Organization {
  member_count: number
  current_user_role?: OrganizationRole
  /** Alias for frontend compatibility (same as current_user_role) */
  user_role?: OrganizationRole
}

/**
 * Organization with full member list
 */
export interface OrganizationWithMembers extends Organization {
  members: OrganizationMemberWithUser[]
}

/**
 * Organization member with user details
 */
export interface OrganizationMemberWithUser extends OrganizationMember {
  user: UserInfo
}

/**
 * Invitation with organization details
 */
export interface InvitationWithOrganization extends OrganizationInvitation {
  organization: Pick<Organization, 'id' | 'name' | 'slug' | 'avatar_url'>
}

/**
 * Study comment with author details
 */
export interface StudyCommentWithAuthor extends StudyComment {
  author: UserInfo
  /** Resolved @mention user info */
  mentioned_users?: UserInfo[]
  /** Nested replies (for threaded display) */
  replies?: StudyCommentWithAuthor[]
}

/**
 * Study comment thread (root + replies)
 */
export interface CommentThread {
  root: StudyCommentWithAuthor
  replies: StudyCommentWithAuthor[]
  reply_count: number
}

/**
 * Share link without password_hash (for API responses)
 */
export interface StudyShareLinkPublic
  extends Omit<StudyShareLink, 'password_hash'> {
  has_password: boolean
}

/**
 * Project with permission info
 */
export interface ProjectWithPermission {
  id: string
  name: string
  organization_id: string | null
  visibility: ProjectVisibility
  user_role: OrganizationRole
  permission_source: MemberSource
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

/**
 * Response for listing organizations
 */
export interface ListOrganizationsResponse {
  organizations: OrganizationWithMeta[]
  total: number
}

/**
 * Response for listing organization members
 */
export interface ListMembersResponse {
  members: OrganizationMemberWithUser[]
  total: number
}

/**
 * Response for listing pending invitations
 */
export interface ListInvitationsResponse {
  invitations: OrganizationInvitation[]
  total: number
}

/**
 * Response for listing study comments
 */
export interface ListCommentsResponse {
  comments: StudyCommentWithAuthor[]
  threads: CommentThread[]
  total: number
}

/**
 * Response for listing share links
 */
export interface ListShareLinksResponse {
  share_links: StudyShareLinkPublic[]
  total: number
}

/**
 * Response for validating a share link
 */
export interface ValidateShareLinkResponse {
  valid: boolean
  requires_password: boolean
  expired: boolean
  study_id?: string
  study_title?: string
  permissions?: {
    allow_download: boolean
    allow_comments: boolean
  }
}

// ============================================================================
// EVENT TYPES (for notifications)
// ============================================================================

export const COLLABORATION_EVENTS = [
  'member.invited',
  'member.joined',
  'member.role_changed',
  'member.removed',
  'comment.created',
  'comment.mentioned',
  'share_link.accessed',
] as const
export type CollaborationEvent = (typeof COLLABORATION_EVENTS)[number]

/**
 * Notification payload for collaboration events
 */
export interface CollaborationNotification {
  event: CollaborationEvent
  organization_id?: string
  project_id?: string
  study_id?: string
  actor_user_id: string
  target_user_id?: string
  data: Record<string, unknown>
  created_at: string
}
