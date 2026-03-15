-- Add 'manager' role to the organization role hierarchy
-- manager sits between editor (can edit content) and admin (can manage members)
-- managers can: create/delete studies, launch/close studies, create projects

-- 1. Update organization_members role constraint
ALTER TABLE organization_members
  DROP CONSTRAINT IF EXISTS organization_members_role_check;
ALTER TABLE organization_members
  ADD CONSTRAINT organization_members_role_check
  CHECK (role IN ('owner', 'admin', 'manager', 'editor', 'viewer'));

-- 2. Update project_members role constraint
ALTER TABLE project_members
  DROP CONSTRAINT IF EXISTS project_members_role_check;
ALTER TABLE project_members
  ADD CONSTRAINT project_members_role_check
  CHECK (role IN ('owner', 'admin', 'manager', 'editor', 'viewer'));

-- 3. Update organization_invitations role constraint
ALTER TABLE organization_invitations
  DROP CONSTRAINT IF EXISTS organization_invitations_role_check;
ALTER TABLE organization_invitations
  ADD CONSTRAINT organization_invitations_role_check
  CHECK (role IN ('admin', 'manager', 'editor', 'viewer'));

-- 4. Update comment on role column
COMMENT ON COLUMN organization_members.role IS 'Role hierarchy: owner > admin > manager > editor > viewer';
