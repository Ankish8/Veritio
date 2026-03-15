-- Fix response tag foreign keys to reference public.users

-- Drop old foreign key constraints (auth.users)
ALTER TABLE response_tags
  DROP CONSTRAINT IF EXISTS response_tags_created_by_fkey;

ALTER TABLE response_tag_assignments
  DROP CONSTRAINT IF EXISTS response_tag_assignments_assigned_by_fkey;

-- Add new constraints pointing to public.users
ALTER TABLE response_tags
  ADD CONSTRAINT response_tags_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE response_tag_assignments
  ADD CONSTRAINT response_tag_assignments_assigned_by_fkey
  FOREIGN KEY (assigned_by) REFERENCES public.users(id) ON DELETE SET NULL;
