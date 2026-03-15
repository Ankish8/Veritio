-- Add organization_id to panel feature tables for proper multi-tenant scoping.
-- Backfills existing data to the user's personal workspace org.

-- ============================================================================
-- panel_participants
-- ============================================================================
ALTER TABLE panel_participants ADD COLUMN IF NOT EXISTS organization_id TEXT;

UPDATE panel_participants pp
SET organization_id = o.id::text
FROM organization_members om
JOIN organizations o ON o.id = om.organization_id
WHERE om.user_id = pp.user_id
  AND (o.settings->>'type') = 'personal'
  AND pp.organization_id IS NULL;

UPDATE panel_participants SET organization_id = user_id WHERE organization_id IS NULL;

ALTER TABLE panel_participants ALTER COLUMN organization_id SET NOT NULL;

-- Remove any duplicate (organization_id, email) rows (keep oldest by created_at)
DELETE FROM panel_participants
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY organization_id, email ORDER BY created_at ASC) AS rn
    FROM panel_participants
  ) sub WHERE rn > 1
);

ALTER TABLE panel_participants DROP CONSTRAINT IF EXISTS unique_email_per_user;
ALTER TABLE panel_participants DROP CONSTRAINT IF EXISTS unique_email_per_org;
ALTER TABLE panel_participants ADD CONSTRAINT unique_email_per_org UNIQUE (organization_id, email);

CREATE INDEX IF NOT EXISTS idx_panel_participants_org_id ON panel_participants(organization_id);

-- ============================================================================
-- panel_tags
-- ============================================================================
ALTER TABLE panel_tags ADD COLUMN IF NOT EXISTS organization_id TEXT;

UPDATE panel_tags pt
SET organization_id = o.id::text
FROM organization_members om
JOIN organizations o ON o.id = om.organization_id
WHERE om.user_id = pt.user_id
  AND (o.settings->>'type') = 'personal'
  AND pt.organization_id IS NULL;

UPDATE panel_tags SET organization_id = user_id WHERE organization_id IS NULL;

ALTER TABLE panel_tags ALTER COLUMN organization_id SET NOT NULL;

-- Remove any duplicate (organization_id, name) tag rows (keep oldest)
DELETE FROM panel_tags
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY organization_id, name ORDER BY created_at ASC) AS rn
    FROM panel_tags
  ) sub WHERE rn > 1
);

ALTER TABLE panel_tags DROP CONSTRAINT IF EXISTS unique_tag_name_per_user;
ALTER TABLE panel_tags DROP CONSTRAINT IF EXISTS unique_tag_name_per_org;
ALTER TABLE panel_tags ADD CONSTRAINT unique_tag_name_per_org UNIQUE (organization_id, name);

CREATE INDEX IF NOT EXISTS idx_panel_tags_org_id ON panel_tags(organization_id);

-- ============================================================================
-- panel_segments
-- ============================================================================
ALTER TABLE panel_segments ADD COLUMN IF NOT EXISTS organization_id TEXT;

UPDATE panel_segments ps
SET organization_id = o.id::text
FROM organization_members om
JOIN organizations o ON o.id = om.organization_id
WHERE om.user_id = ps.user_id
  AND (o.settings->>'type') = 'personal'
  AND ps.organization_id IS NULL;

UPDATE panel_segments SET organization_id = user_id WHERE organization_id IS NULL;

ALTER TABLE panel_segments ALTER COLUMN organization_id SET NOT NULL;

-- Remove any duplicate (organization_id, name) segment rows (keep oldest)
DELETE FROM panel_segments
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY organization_id, name ORDER BY created_at ASC) AS rn
    FROM panel_segments
  ) sub WHERE rn > 1
);

ALTER TABLE panel_segments DROP CONSTRAINT IF EXISTS unique_segment_name_per_user;
ALTER TABLE panel_segments DROP CONSTRAINT IF EXISTS unique_segment_name_per_org;
ALTER TABLE panel_segments ADD CONSTRAINT unique_segment_name_per_org UNIQUE (organization_id, name);

CREATE INDEX IF NOT EXISTS idx_panel_segments_org_id ON panel_segments(organization_id);

-- ============================================================================
-- panel_widget_configs
-- ============================================================================
ALTER TABLE panel_widget_configs ADD COLUMN IF NOT EXISTS organization_id TEXT;

UPDATE panel_widget_configs pwc
SET organization_id = o.id::text
FROM organization_members om
JOIN organizations o ON o.id = om.organization_id
WHERE om.user_id = pwc.user_id
  AND (o.settings->>'type') = 'personal'
  AND pwc.organization_id IS NULL;

UPDATE panel_widget_configs SET organization_id = user_id WHERE organization_id IS NULL;

ALTER TABLE panel_widget_configs ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE panel_widget_configs DROP CONSTRAINT IF EXISTS panel_widget_configs_pkey;
ALTER TABLE panel_widget_configs ADD PRIMARY KEY (user_id, organization_id);
