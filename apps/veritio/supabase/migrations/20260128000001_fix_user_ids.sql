-- Migration: Fix user IDs by assigning all content to the current Better Auth user
-- This is a one-time fix for the Clerk to Better Auth migration
-- For multi-user setups, you would need a more sophisticated migration

DO $$
DECLARE
    better_auth_user_id TEXT;
    user_email TEXT;
    project_count INT;
    study_count INT;
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

    RAISE NOTICE 'Assigning all content to Better Auth user: % (%)', better_auth_user_id, user_email;

    -- Count before update
    SELECT COUNT(*) INTO project_count FROM public.projects;
    SELECT COUNT(*) INTO study_count FROM public.studies;

    RAISE NOTICE 'Found % projects and % studies', project_count, study_count;

    -- Update ALL projects to the Better Auth user (not just NULL ones)
    UPDATE public.projects
    SET user_id = better_auth_user_id
    WHERE user_id IS DISTINCT FROM better_auth_user_id;

    RAISE NOTICE 'Projects updated';

    -- Update ALL studies to the Better Auth user
    UPDATE public.studies
    SET user_id = better_auth_user_id
    WHERE user_id IS DISTINCT FROM better_auth_user_id;

    RAISE NOTICE 'Studies updated';

    -- Update other tables
    UPDATE public.folders
    SET user_id = better_auth_user_id
    WHERE user_id IS DISTINCT FROM better_auth_user_id;

    UPDATE public.study_segments
    SET user_id = better_auth_user_id
    WHERE user_id IS DISTINCT FROM better_auth_user_id;

    UPDATE public.study_section_notes
    SET user_id = better_auth_user_id
    WHERE user_id IS DISTINCT FROM better_auth_user_id;

    UPDATE public.study_question_notes
    SET user_id = better_auth_user_id
    WHERE user_id IS DISTINCT FROM better_auth_user_id;

    UPDATE public.user_favorites
    SET user_id = better_auth_user_id
    WHERE user_id IS DISTINCT FROM better_auth_user_id;

    RAISE NOTICE 'All user IDs fixed successfully!';
END $$;
