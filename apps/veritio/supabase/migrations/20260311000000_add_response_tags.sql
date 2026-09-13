-- Response Tags Migration
-- Adds tables for response tagging functionality

-- Create response_tags table
CREATE TABLE IF NOT EXISTS response_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id UUID NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  color VARCHAR(7) NOT NULL DEFAULT '#6b7280', -- hex color
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by TEXT REFERENCES public."user"(id) ON DELETE SET NULL,

  -- Unique constraint: no duplicate tag names per study
  CONSTRAINT unique_tag_name_per_study UNIQUE (study_id, name)
);

-- Create response_tag_assignments table
CREATE TABLE IF NOT EXISTS response_tag_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_id UUID NOT NULL REFERENCES response_tags(id) ON DELETE CASCADE,
  response_id UUID NOT NULL,
  response_type VARCHAR(20) NOT NULL CHECK (response_type IN ('first_impression', 'flow_question', 'questionnaire')),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  assigned_by TEXT REFERENCES public."user"(id) ON DELETE SET NULL,

  -- Unique constraint: can't assign same tag to same response twice
  CONSTRAINT unique_tag_assignment UNIQUE (tag_id, response_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_response_tags_study_id ON response_tags(study_id);
CREATE INDEX IF NOT EXISTS idx_response_tag_assignments_tag_id ON response_tag_assignments(tag_id);
CREATE INDEX IF NOT EXISTS idx_response_tag_assignments_response_id ON response_tag_assignments(response_id);
CREATE INDEX IF NOT EXISTS idx_response_tag_assignments_response_type ON response_tag_assignments(response_type);

-- Enable RLS
ALTER TABLE response_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE response_tag_assignments ENABLE ROW LEVEL SECURITY;

-- Better Auth is enforced by the application authorization core. Browser
-- clients receive no direct table policy; the service role and the direct
-- PostgreSQL role are the only database principals allowed through RLS.
CREATE POLICY "Service role manages response tags"
  ON response_tags FOR ALL TO service_role, postgres
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role manages response tag assignments"
  ON response_tag_assignments FOR ALL TO service_role, postgres
  USING (true) WITH CHECK (true);

-- Add comments
COMMENT ON TABLE response_tags IS 'Tags that can be applied to study responses for categorization';
COMMENT ON TABLE response_tag_assignments IS 'Junction table linking tags to specific responses';
COMMENT ON COLUMN response_tags.color IS 'Hex color code for the tag (e.g., #22c55e)';
COMMENT ON COLUMN response_tag_assignments.response_type IS 'Type of response: first_impression, flow_question, or questionnaire';
