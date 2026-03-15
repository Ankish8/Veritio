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
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

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
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

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

-- RLS Policies for response_tags
-- Users can view tags for studies they have access to
CREATE POLICY "Users can view tags for accessible studies"
  ON response_tags FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM studies s
      JOIN projects p ON s.project_id = p.id
      WHERE s.id = response_tags.study_id
      AND (p.user_id = auth.uid() OR p.team_id IN (
        SELECT team_id FROM team_members WHERE user_id = auth.uid()
      ))
    )
  );

-- Users can create tags for studies they have access to
CREATE POLICY "Users can create tags for accessible studies"
  ON response_tags FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM studies s
      JOIN projects p ON s.project_id = p.id
      WHERE s.id = response_tags.study_id
      AND (p.user_id = auth.uid() OR p.team_id IN (
        SELECT team_id FROM team_members WHERE user_id = auth.uid()
      ))
    )
  );

-- Users can update tags they created or for studies they have access to
CREATE POLICY "Users can update tags for accessible studies"
  ON response_tags FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM studies s
      JOIN projects p ON s.project_id = p.id
      WHERE s.id = response_tags.study_id
      AND (p.user_id = auth.uid() OR p.team_id IN (
        SELECT team_id FROM team_members WHERE user_id = auth.uid()
      ))
    )
  );

-- Users can delete tags for studies they have access to
CREATE POLICY "Users can delete tags for accessible studies"
  ON response_tags FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM studies s
      JOIN projects p ON s.project_id = p.id
      WHERE s.id = response_tags.study_id
      AND (p.user_id = auth.uid() OR p.team_id IN (
        SELECT team_id FROM team_members WHERE user_id = auth.uid()
      ))
    )
  );

-- RLS Policies for response_tag_assignments
-- Users can view assignments for tags they can access
CREATE POLICY "Users can view tag assignments for accessible tags"
  ON response_tag_assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM response_tags rt
      JOIN studies s ON rt.study_id = s.id
      JOIN projects p ON s.project_id = p.id
      WHERE rt.id = response_tag_assignments.tag_id
      AND (p.user_id = auth.uid() OR p.team_id IN (
        SELECT team_id FROM team_members WHERE user_id = auth.uid()
      ))
    )
  );

-- Users can create assignments for tags they can access
CREATE POLICY "Users can create tag assignments for accessible tags"
  ON response_tag_assignments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM response_tags rt
      JOIN studies s ON rt.study_id = s.id
      JOIN projects p ON s.project_id = p.id
      WHERE rt.id = response_tag_assignments.tag_id
      AND (p.user_id = auth.uid() OR p.team_id IN (
        SELECT team_id FROM team_members WHERE user_id = auth.uid()
      ))
    )
  );

-- Users can delete assignments for tags they can access
CREATE POLICY "Users can delete tag assignments for accessible tags"
  ON response_tag_assignments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM response_tags rt
      JOIN studies s ON rt.study_id = s.id
      JOIN projects p ON s.project_id = p.id
      WHERE rt.id = response_tag_assignments.tag_id
      AND (p.user_id = auth.uid() OR p.team_id IN (
        SELECT team_id FROM team_members WHERE user_id = auth.uid()
      ))
    )
  );

-- Add comments
COMMENT ON TABLE response_tags IS 'Tags that can be applied to study responses for categorization';
COMMENT ON TABLE response_tag_assignments IS 'Junction table linking tags to specific responses';
COMMENT ON COLUMN response_tags.color IS 'Hex color code for the tag (e.g., #22c55e)';
COMMENT ON COLUMN response_tag_assignments.response_type IS 'Type of response: first_impression, flow_question, or questionnaire';
