-- Study Builder Enhancement Migration
-- Adds fields for Details, Settings, and Branding tabs

-- ============================================================================
-- FOLDERS TABLE
-- Allows users to organize studies into folders within projects
-- ============================================================================
CREATE TABLE IF NOT EXISTS folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT NOT NULL,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT, -- Optional color for visual organization
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Each folder name must be unique within a project
  UNIQUE(project_id, name)
);

-- ============================================================================
-- EXTEND STUDIES TABLE
-- Add fields for Details, Settings, and Branding tabs
-- ============================================================================

-- Details Tab Fields
ALTER TABLE studies ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES folders(id) ON DELETE SET NULL;
ALTER TABLE studies ADD COLUMN IF NOT EXISTS purpose TEXT;
ALTER TABLE studies ADD COLUMN IF NOT EXISTS participant_requirements TEXT;
ALTER TABLE studies ADD COLUMN IF NOT EXISTS file_attachments JSONB DEFAULT '[]';
-- file_attachments shape: [{ id, url, filename, size, mimeType, uploadedAt }]

-- Settings Tab Fields
ALTER TABLE studies ADD COLUMN IF NOT EXISTS url_slug TEXT;
ALTER TABLE studies ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en-US';
ALTER TABLE studies ADD COLUMN IF NOT EXISTS password TEXT;
ALTER TABLE studies ADD COLUMN IF NOT EXISTS session_replay_enabled BOOLEAN DEFAULT false;
ALTER TABLE studies ADD COLUMN IF NOT EXISTS closing_rule JSONB DEFAULT '{"type": "none"}';
-- closing_rule shape: { type: 'none'|'date'|'participant_count'|'both', closeDate?, maxParticipants?, closeMessage? }

-- Branding Tab Fields
ALTER TABLE studies ADD COLUMN IF NOT EXISTS branding JSONB DEFAULT '{}';
-- branding shape: { logo?: { url, filename }, socialImage?: { url, filename }, primaryColor?, buttonText?: { continue?, finished? } }

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_folders_project ON folders(project_id);
CREATE INDEX IF NOT EXISTS idx_folders_user ON folders(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_studies_folder ON studies(folder_id);
CREATE INDEX IF NOT EXISTS idx_studies_url_slug ON studies(url_slug);

-- ============================================================================
-- UNIQUE CONSTRAINT FOR URL SLUGS
-- Each study should have a unique URL slug (within the org, if we add org_id later)
-- For now, globally unique is fine
-- ============================================================================
-- Note: We don't add UNIQUE constraint on url_slug directly because it can be NULL
-- and we want to allow multiple NULL values. We'll enforce uniqueness in the app.
CREATE UNIQUE INDEX IF NOT EXISTS idx_studies_url_slug_unique
  ON studies(url_slug)
  WHERE url_slug IS NOT NULL;

-- ============================================================================
-- ROW LEVEL SECURITY FOR FOLDERS
-- ============================================================================
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all folders operations" ON folders;
CREATE POLICY "Allow all folders operations"
  ON folders FOR ALL USING (true);

-- ============================================================================
-- TRIGGERS
-- ============================================================================
DROP TRIGGER IF EXISTS folders_updated_at ON folders;
CREATE TRIGGER folders_updated_at
  BEFORE UPDATE ON folders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- GRANTS
-- ============================================================================
GRANT ALL ON folders TO authenticated;
GRANT ALL ON folders TO anon;

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE folders IS 'Folders for organizing studies within projects';
COMMENT ON COLUMN studies.url_slug IS 'Custom URL slug for the study (e.g., my-study-2024)';
COMMENT ON COLUMN studies.language IS 'Language code for study UI (e.g., en-US, es, fr)';
COMMENT ON COLUMN studies.password IS 'Optional password protection for the study';
COMMENT ON COLUMN studies.session_replay_enabled IS 'Whether to record participant sessions (placeholder - not implemented)';
COMMENT ON COLUMN studies.closing_rule IS 'Rules for automatically closing the study';
COMMENT ON COLUMN studies.branding IS 'Custom branding settings (logo, colors, button text)';
COMMENT ON COLUMN studies.purpose IS 'Internal purpose/goal of the study (not shown to participants)';
COMMENT ON COLUMN studies.participant_requirements IS 'Requirements for participants (internal notes)';
COMMENT ON COLUMN studies.file_attachments IS 'Array of attached reference files/links';
