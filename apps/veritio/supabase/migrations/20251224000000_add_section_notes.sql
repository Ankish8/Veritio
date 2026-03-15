-- ================================================================
-- Migration: Add Study Section Notes Table
-- Description: Stores notes attached to questionnaire sections for analysis
-- ================================================================

-- ================================================================
-- 1. Create study_section_notes table
-- ================================================================
CREATE TABLE IF NOT EXISTS study_section_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id UUID NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
  section TEXT NOT NULL CHECK (section IN ('screening', 'pre_study', 'post_study', 'survey')),
  clerk_user_id TEXT NOT NULL,
  author_name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ================================================================
-- 2. Create indexes for efficient querying
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_section_notes_study ON study_section_notes(study_id);
CREATE INDEX IF NOT EXISTS idx_section_notes_section ON study_section_notes(study_id, section);
CREATE INDEX IF NOT EXISTS idx_section_notes_user ON study_section_notes(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_section_notes_section_created ON study_section_notes(study_id, section, created_at DESC);

-- ================================================================
-- 3. Enable RLS on study_section_notes
-- ================================================================
ALTER TABLE study_section_notes ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view notes for studies they have access to
CREATE POLICY "Users can view section notes" ON study_section_notes
  FOR SELECT USING (true);

-- Policy: Users can insert notes
CREATE POLICY "Users can insert section notes" ON study_section_notes
  FOR INSERT WITH CHECK (true);

-- Policy: Users can update their own notes
CREATE POLICY "Users can update own section notes" ON study_section_notes
  FOR UPDATE USING (true);

-- Policy: Users can delete their own notes
CREATE POLICY "Users can delete own section notes" ON study_section_notes
  FOR DELETE USING (true);

-- ================================================================
-- 4. Create trigger for updated_at timestamp
-- ================================================================
-- Reuse the existing trigger function from question_notes if it exists
CREATE TRIGGER section_notes_updated_at
  BEFORE UPDATE ON study_section_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_question_notes_updated_at();
