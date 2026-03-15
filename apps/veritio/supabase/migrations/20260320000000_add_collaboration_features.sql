-- Collaboration Features Migration
-- Adds organizations, memberships, invitations, comments, and share links
-- Part of the multi-tenant collaboration system for Veritio UX Research Platform

-- ============================================================================
-- ORGANIZATIONS
-- ============================================================================

-- Organizations table (teams/workspaces)
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (length(name) >= 1 AND length(name) <= 255),
  slug TEXT UNIQUE NOT NULL CHECK (slug ~ '^[a-z0-9-]+$' AND length(slug) >= 2 AND length(slug) <= 63),
  avatar_url TEXT,
  settings JSONB DEFAULT '{}'::jsonb,

  -- Ownership (creator becomes first owner)
  created_by_user_id TEXT NOT NULL,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Soft delete
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_organizations_created_by ON organizations(created_by_user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_organizations_deleted_at ON organizations(deleted_at) WHERE deleted_at IS NOT NULL;

COMMENT ON TABLE organizations IS 'Organizations/workspaces that contain projects and members';
COMMENT ON COLUMN organizations.settings IS 'JSON settings including: type (personal/team), billing info, branding defaults';
COMMENT ON COLUMN organizations.slug IS 'URL-safe identifier for organization (e.g., acme-corp)';


-- ============================================================================
-- ORGANIZATION MEMBERS & ROLES
-- ============================================================================

-- Organization members with RBAC roles
CREATE TABLE IF NOT EXISTS organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,

  -- Role: owner > admin > editor > viewer
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),

  -- Invite metadata
  invited_by_user_id TEXT,
  invited_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- One membership per user per org
  UNIQUE(organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_org_members_org ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_role ON organization_members(organization_id, role);
CREATE INDEX IF NOT EXISTS idx_org_members_joined ON organization_members(organization_id) WHERE joined_at IS NOT NULL;

COMMENT ON TABLE organization_members IS 'Organization membership with role-based access control';
COMMENT ON COLUMN organization_members.role IS 'Role hierarchy: owner (4) > admin (3) > editor (2) > viewer (1)';
COMMENT ON COLUMN organization_members.joined_at IS 'NULL = pending invite, set when user accepts';


-- ============================================================================
-- ORGANIZATION INVITATIONS (Email + Link-based)
-- ============================================================================

-- Organization invitations (email or link-based)
CREATE TABLE IF NOT EXISTS organization_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Invite type: email or link
  invite_type TEXT NOT NULL CHECK (invite_type IN ('email', 'link')),

  -- For email invites
  email TEXT,

  -- For link invites
  invite_token TEXT UNIQUE DEFAULT nanoid(32),
  max_uses INTEGER, -- NULL = unlimited
  uses_count INTEGER DEFAULT 0 NOT NULL,

  -- Role to assign on accept (can't invite as owner)
  role TEXT NOT NULL CHECK (role IN ('admin', 'editor', 'viewer')),

  -- Invite metadata
  invited_by_user_id TEXT NOT NULL,
  message TEXT,

  -- Expiration
  expires_at TIMESTAMPTZ,

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  accepted_at TIMESTAMPTZ,
  accepted_by_user_id TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Validation: email invites must have email, link invites must have token
  CHECK (
    (invite_type = 'email' AND email IS NOT NULL) OR
    (invite_type = 'link' AND invite_token IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_org_invitations_org ON organization_invitations(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_invitations_email ON organization_invitations(email) WHERE invite_type = 'email';
CREATE INDEX IF NOT EXISTS idx_org_invitations_token ON organization_invitations(invite_token) WHERE invite_type = 'link';
CREATE INDEX IF NOT EXISTS idx_org_invitations_status ON organization_invitations(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_org_invitations_pending ON organization_invitations(organization_id) WHERE status = 'pending';

COMMENT ON TABLE organization_invitations IS 'Pending invitations to join an organization';
COMMENT ON COLUMN organization_invitations.invite_type IS 'email = sent to specific email, link = shareable URL';
COMMENT ON COLUMN organization_invitations.max_uses IS 'For link invites: NULL = unlimited uses';


-- ============================================================================
-- PROJECT-LEVEL PERMISSION OVERRIDES
-- ============================================================================

-- Project-level member overrides (optional: override org role for specific projects)
CREATE TABLE IF NOT EXISTS project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

  -- Role override (can be more or less restrictive than org role)
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),

  -- Source: inherited (from org) or explicit (added directly)
  source TEXT DEFAULT 'explicit' CHECK (source IN ('inherited', 'explicit')),

  added_by_user_id TEXT,
  added_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- One membership per user per project
  UNIQUE(project_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_project_members_project ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user ON project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_project_members_org ON project_members(organization_id);

COMMENT ON TABLE project_members IS 'Optional project-level permission overrides. If no override exists, use organization_members role.';


-- ============================================================================
-- STUDY COMMENTS WITH @MENTIONS
-- ============================================================================

-- Study-level comments with threading and @mentions
CREATE TABLE IF NOT EXISTS study_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id UUID NOT NULL REFERENCES studies(id) ON DELETE CASCADE,

  -- Comment metadata
  author_user_id TEXT NOT NULL,
  content TEXT NOT NULL CHECK (length(content) >= 1 AND length(content) <= 10000),

  -- Threading (optional: for nested replies)
  parent_comment_id UUID REFERENCES study_comments(id) ON DELETE CASCADE,
  thread_position INTEGER DEFAULT 0,

  -- Mentions (array of user IDs mentioned with @)
  mentions TEXT[] DEFAULT '{}',

  -- Soft delete (preserve thread integrity)
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  deleted_by_user_id TEXT,

  -- Edit tracking
  edited_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_study_comments_study ON study_comments(study_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_study_comments_author ON study_comments(author_user_id);
CREATE INDEX IF NOT EXISTS idx_study_comments_parent ON study_comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_study_comments_mentions ON study_comments USING GIN(mentions);
CREATE INDEX IF NOT EXISTS idx_study_comments_created ON study_comments(study_id, created_at DESC) WHERE is_deleted = FALSE;

COMMENT ON TABLE study_comments IS 'Study-level comments for team collaboration (like Figma comments)';
COMMENT ON COLUMN study_comments.mentions IS 'Array of user_ids mentioned with @ syntax';
COMMENT ON COLUMN study_comments.thread_position IS 'Position within thread for ordering replies';


-- ============================================================================
-- STUDY SHARE LINKS (View-only external access)
-- ============================================================================

-- Public share links for studies (view-only, no auth required)
CREATE TABLE IF NOT EXISTS study_share_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id UUID NOT NULL REFERENCES studies(id) ON DELETE CASCADE,

  -- Share token (URL-safe)
  share_token TEXT UNIQUE NOT NULL DEFAULT nanoid(16),

  -- Access control
  password_hash TEXT, -- Optional password protection (bcrypt hash)
  expires_at TIMESTAMPTZ,

  -- Permissions for external viewers
  allow_download BOOLEAN DEFAULT FALSE,
  allow_comments BOOLEAN DEFAULT FALSE,

  -- Metadata
  label TEXT, -- User-provided label (e.g., "Client Review Link")
  created_by_user_id TEXT NOT NULL,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Analytics
  view_count INTEGER DEFAULT 0,
  last_viewed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_study_share_links_study ON study_share_links(study_id);
CREATE INDEX IF NOT EXISTS idx_study_share_links_token ON study_share_links(share_token) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_study_share_links_active ON study_share_links(study_id) WHERE is_active = TRUE;

COMMENT ON TABLE study_share_links IS 'View-only share links for external stakeholders (no login required)';
COMMENT ON COLUMN study_share_links.share_token IS '16-char nanoid for URLs: /share/[token]';
COMMENT ON COLUMN study_share_links.password_hash IS 'Optional bcrypt hash for password protection';


-- ============================================================================
-- MODIFY EXISTING TABLES
-- ============================================================================

-- Add organization relationship to projects
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'private' CHECK (visibility IN ('private', 'org_visible'));

CREATE INDEX IF NOT EXISTS idx_projects_organization ON projects(organization_id);

COMMENT ON COLUMN projects.organization_id IS 'Organization owning this project. NULL = legacy personal project (will be migrated)';
COMMENT ON COLUMN projects.visibility IS 'private = only assigned members, org_visible = all org members can view';


-- ============================================================================
-- HELPER VIEWS FOR PERMISSION CHECKING
-- ============================================================================

-- View: Effective project permissions (combines org + project-level)
CREATE OR REPLACE VIEW project_permissions AS
SELECT DISTINCT ON (p.id, COALESCE(pm.user_id, om.user_id))
  p.id AS project_id,
  p.organization_id,
  COALESCE(pm.user_id, om.user_id) AS user_id,
  COALESCE(pm.role, om.role) AS effective_role,
  CASE WHEN pm.id IS NOT NULL THEN 'explicit' ELSE 'inherited' END AS source
FROM projects p
LEFT JOIN organization_members om ON p.organization_id = om.organization_id AND om.joined_at IS NOT NULL
LEFT JOIN project_members pm ON p.id = pm.project_id
WHERE p.organization_id IS NOT NULL
  AND (pm.user_id IS NOT NULL OR om.user_id IS NOT NULL)
ORDER BY p.id, COALESCE(pm.user_id, om.user_id), pm.created_at DESC NULLS LAST;

-- View: Effective study permissions (inherited from project)
CREATE OR REPLACE VIEW study_permissions AS
SELECT
  s.id AS study_id,
  s.project_id,
  pp.organization_id,
  pp.user_id,
  pp.effective_role,
  pp.source
FROM studies s
JOIN project_permissions pp ON s.project_id = pp.project_id;

COMMENT ON VIEW project_permissions IS 'Effective permissions for projects (combines org + project-level overrides)';
COMMENT ON VIEW study_permissions IS 'Effective permissions for studies (inherited from projects)';


-- ============================================================================
-- MIGRATE EXISTING DATA TO PERSONAL WORKSPACES
-- ============================================================================

-- Create personal workspace for each user with existing projects
DO $$
DECLARE
  user_record RECORD;
  org_id UUID;
  org_slug TEXT;
BEGIN
  -- Find all users with projects that don't have an organization
  FOR user_record IN
    SELECT DISTINCT user_id FROM projects WHERE organization_id IS NULL AND user_id IS NOT NULL
  LOOP
    -- Generate unique slug (lowercase to pass check constraint)
    org_slug := 'personal-' || lower(substring(user_record.user_id, 1, 8)) || '-' || floor(random() * 10000)::text;

    -- Create personal organization
    INSERT INTO organizations (name, slug, created_by_user_id, settings)
    VALUES (
      'Personal Workspace',
      org_slug,
      user_record.user_id,
      '{"type": "personal"}'::jsonb
    )
    RETURNING id INTO org_id;

    -- Add user as owner
    INSERT INTO organization_members (organization_id, user_id, role, joined_at)
    VALUES (org_id, user_record.user_id, 'owner', NOW());

    -- Link all user's projects to this organization
    UPDATE projects
    SET organization_id = org_id
    WHERE user_id = user_record.user_id AND organization_id IS NULL;

    RAISE NOTICE 'Migrated user % to personal workspace %', user_record.user_id, org_id;
  END LOOP;
END $$;


-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_share_links ENABLE ROW LEVEL SECURITY;

-- Organizations: Members can read, only owners/admins can modify
DROP POLICY IF EXISTS "organizations_select" ON organizations;
CREATE POLICY "organizations_select" ON organizations
  FOR SELECT
  USING (
    deleted_at IS NULL AND (
      -- Service role bypass
      current_setting('role', true) = 'service_role'
      OR
      -- Member can read
      id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = current_setting('request.jwt.claims', true)::json->>'sub'
          AND joined_at IS NOT NULL
      )
    )
  );

DROP POLICY IF EXISTS "organizations_insert" ON organizations;
CREATE POLICY "organizations_insert" ON organizations
  FOR INSERT
  WITH CHECK (
    current_setting('role', true) = 'service_role'
    OR created_by_user_id = current_setting('request.jwt.claims', true)::json->>'sub'
  );

DROP POLICY IF EXISTS "organizations_update" ON organizations;
CREATE POLICY "organizations_update" ON organizations
  FOR UPDATE
  USING (
    current_setting('role', true) = 'service_role'
    OR
    id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = current_setting('request.jwt.claims', true)::json->>'sub'
        AND role IN ('owner', 'admin')
        AND joined_at IS NOT NULL
    )
  );

DROP POLICY IF EXISTS "organizations_delete" ON organizations;
CREATE POLICY "organizations_delete" ON organizations
  FOR DELETE
  USING (
    current_setting('role', true) = 'service_role'
    OR
    id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = current_setting('request.jwt.claims', true)::json->>'sub'
        AND role = 'owner'
        AND joined_at IS NOT NULL
    )
  );

-- Organization members: Service role for now (app-layer handles permissions)
DROP POLICY IF EXISTS "org_members_all" ON organization_members;
CREATE POLICY "org_members_all" ON organization_members
  FOR ALL
  USING (true);

-- Organization invitations: Service role for now
DROP POLICY IF EXISTS "org_invitations_all" ON organization_invitations;
CREATE POLICY "org_invitations_all" ON organization_invitations
  FOR ALL
  USING (true);

-- Project members: Service role for now
DROP POLICY IF EXISTS "project_members_all" ON project_members;
CREATE POLICY "project_members_all" ON project_members
  FOR ALL
  USING (true);

-- Study comments: Service role for now
DROP POLICY IF EXISTS "study_comments_all" ON study_comments;
CREATE POLICY "study_comments_all" ON study_comments
  FOR ALL
  USING (true);

-- Study share links: Service role for now
DROP POLICY IF EXISTS "study_share_links_all" ON study_share_links;
CREATE POLICY "study_share_links_all" ON study_share_links
  FOR ALL
  USING (true);

-- Update projects policy to respect organization membership
DROP POLICY IF EXISTS "Allow all project operations" ON projects;
CREATE POLICY "projects_access" ON projects
  FOR ALL
  USING (
    current_setting('role', true) = 'service_role'
    OR
    -- Personal projects (legacy, no org)
    (organization_id IS NULL AND user_id = current_setting('request.jwt.claims', true)::json->>'sub')
    OR
    -- Org projects (via membership)
    (organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = current_setting('request.jwt.claims', true)::json->>'sub'
        AND joined_at IS NOT NULL
    ))
  );


-- ============================================================================
-- UPDATED_AT TRIGGERS
-- ============================================================================

DROP TRIGGER IF EXISTS organizations_updated_at ON organizations;
CREATE TRIGGER organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS organization_members_updated_at ON organization_members;
CREATE TRIGGER organization_members_updated_at
  BEFORE UPDATE ON organization_members
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS organization_invitations_updated_at ON organization_invitations;
CREATE TRIGGER organization_invitations_updated_at
  BEFORE UPDATE ON organization_invitations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS project_members_updated_at ON project_members;
CREATE TRIGGER project_members_updated_at
  BEFORE UPDATE ON project_members
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS study_comments_updated_at ON study_comments;
CREATE TRIGGER study_comments_updated_at
  BEFORE UPDATE ON study_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS study_share_links_updated_at ON study_share_links;
CREATE TRIGGER study_share_links_updated_at
  BEFORE UPDATE ON study_share_links
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();


-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT ALL ON organizations TO authenticated, anon;
GRANT ALL ON organization_members TO authenticated, anon;
GRANT ALL ON organization_invitations TO authenticated, anon;
GRANT ALL ON project_members TO authenticated, anon;
GRANT ALL ON study_comments TO authenticated, anon;
GRANT ALL ON study_share_links TO authenticated, anon;
GRANT SELECT ON project_permissions TO authenticated, anon;
GRANT SELECT ON study_permissions TO authenticated, anon;
