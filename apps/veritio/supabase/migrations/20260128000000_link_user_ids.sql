-- Migration: Link existing projects/studies to Better Auth user IDs
-- This migration transfers ownership from Clerk user IDs to Better Auth user IDs
-- For single-user setups, it assigns all content to the first Better Auth user

-- Step 1: Create a temporary function to get the Better Auth user ID
-- For development, we match by email or assign to the first user
DO $$
DECLARE
    better_auth_user_id TEXT;
    user_email TEXT;
BEGIN
    -- Find the first Better Auth user
    SELECT id, email INTO better_auth_user_id, user_email
    FROM public."user"
    ORDER BY "createdAt" ASC
    LIMIT 1;

    IF better_auth_user_id IS NULL THEN
        RAISE NOTICE 'No Better Auth user found. Skipping migration.';
        RETURN;
    END IF;

    RAISE NOTICE 'Migrating content to Better Auth user: % (%)', better_auth_user_id, user_email;

    -- Step 2: Update projects with NULL user_id
    UPDATE public.projects
    SET user_id = better_auth_user_id
    WHERE user_id IS NULL;

    RAISE NOTICE 'Updated % projects', (SELECT COUNT(*) FROM public.projects WHERE user_id = better_auth_user_id);

    -- Step 3: Update studies with NULL user_id
    UPDATE public.studies
    SET user_id = better_auth_user_id
    WHERE user_id IS NULL;

    RAISE NOTICE 'Updated % studies', (SELECT COUNT(*) FROM public.studies WHERE user_id = better_auth_user_id);

    -- Step 4: Update folders with NULL user_id
    UPDATE public.folders
    SET user_id = better_auth_user_id
    WHERE user_id IS NULL;

    -- Step 5: Update study_segments with NULL user_id
    UPDATE public.study_segments
    SET user_id = better_auth_user_id
    WHERE user_id IS NULL;

    -- Step 6: Update study_section_notes with NULL user_id
    UPDATE public.study_section_notes
    SET user_id = better_auth_user_id
    WHERE user_id IS NULL;

    -- Step 7: Update study_question_notes with NULL user_id
    UPDATE public.study_question_notes
    SET user_id = better_auth_user_id
    WHERE user_id IS NULL;

    -- Step 8: Update user_favorites with NULL user_id
    UPDATE public.user_favorites
    SET user_id = better_auth_user_id
    WHERE user_id IS NULL;

    RAISE NOTICE 'User ID migration completed successfully!';
END $$;

-- Add comment to track migration
COMMENT ON COLUMN public.projects.user_id IS 'Better Auth user ID - migrated from clerk_user_id';
COMMENT ON COLUMN public.studies.user_id IS 'Better Auth user ID - migrated from clerk_user_id';
