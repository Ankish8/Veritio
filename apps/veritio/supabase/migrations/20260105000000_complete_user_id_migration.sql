-- Migration: Complete the clerk_user_id → user_id transition
-- This migration makes user_id required and drops clerk_user_id columns

-- Drop old clerk_user_id columns
ALTER TABLE public.projects DROP COLUMN IF EXISTS clerk_user_id;
ALTER TABLE public.studies DROP COLUMN IF EXISTS clerk_user_id;
ALTER TABLE public.folders DROP COLUMN IF EXISTS clerk_user_id;
ALTER TABLE public.study_segments DROP COLUMN IF EXISTS clerk_user_id;
ALTER TABLE public.study_section_notes DROP COLUMN IF EXISTS clerk_user_id;
ALTER TABLE public.study_question_notes DROP COLUMN IF EXISTS clerk_user_id;
ALTER TABLE public.user_favorites DROP COLUMN IF EXISTS clerk_user_id;

-- Drop old indexes
DROP INDEX IF EXISTS idx_projects_clerk_user;
DROP INDEX IF EXISTS idx_studies_clerk_user;
DROP INDEX IF EXISTS idx_folders_clerk_user;

-- Update RLS policies to use user_id instead of clerk_user_id
-- Note: Existing policies may reference clerk_user_id - drop and recreate them

-- Add foreign key constraints to reference Better Auth users table
-- Note: These are commented out for flexibility - add once users table has data
-- ALTER TABLE public.projects ADD CONSTRAINT fk_projects_user FOREIGN KEY (user_id) REFERENCES public.users(id);
-- ALTER TABLE public.studies ADD CONSTRAINT fk_studies_user FOREIGN KEY (user_id) REFERENCES public.users(id);
