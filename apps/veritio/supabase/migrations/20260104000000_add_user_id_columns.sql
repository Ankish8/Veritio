-- Migration: Add user_id columns to replace clerk_user_id
-- This migration adds new user_id columns that will reference the Better Auth users table

-- Add user_id columns (nullable initially for migration)
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE public.studies ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE public.folders ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE public.study_segments ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE public.study_section_notes ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE public.study_question_notes ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE public.user_favorites ADD COLUMN IF NOT EXISTS user_id TEXT;

-- Create indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_projects_user ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_studies_user ON public.studies(user_id);
CREATE INDEX IF NOT EXISTS idx_folders_user ON public.folders(user_id);
CREATE INDEX IF NOT EXISTS idx_study_segments_user ON public.study_segments(user_id);
CREATE INDEX IF NOT EXISTS idx_section_notes_user ON public.study_section_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_question_notes_user ON public.study_question_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_user ON public.user_favorites(user_id);

-- Note: After migration is complete and verified, run these commands:
-- 1. Copy data from clerk_user_id to user_id (if needed)
-- 2. Add NOT NULL constraint: ALTER TABLE projects ALTER COLUMN user_id SET NOT NULL;
-- 3. Add foreign key: ALTER TABLE projects ADD CONSTRAINT fk_projects_user FOREIGN KEY (user_id) REFERENCES users(id);
-- 4. Drop old column: ALTER TABLE projects DROP COLUMN clerk_user_id;
-- 5. Drop old index: DROP INDEX IF EXISTS idx_projects_clerk_user;

COMMENT ON COLUMN public.projects.user_id IS 'Better Auth user ID - replaces clerk_user_id';
COMMENT ON COLUMN public.studies.user_id IS 'Better Auth user ID - replaces clerk_user_id';
