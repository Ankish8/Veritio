-- Remove abandoned background uploads without touching active branding
-- references. Deleted-study folders remain governed by the existing 30-day
-- cleanup function.

CREATE OR REPLACE FUNCTION public.get_orphaned_background_storage_objects()
RETURNS TABLE(id uuid, name text, created_at timestamptz, bucket_id text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, storage
AS $$
  SELECT
    so.id,
    so.name,
    so.created_at,
    so.bucket_id
  FROM storage.objects so
  WHERE so.bucket_id = 'study-assets'
    AND (storage.foldername(so.name))[2] = 'backgrounds'
    AND so.created_at < NOW() - INTERVAL '7 days'
    -- Leave deleted-study folders to the existing 30-day cleanup policy.
    AND EXISTS (
      SELECT 1
      FROM public.studies s
      WHERE s.id::text = (storage.foldername(so.name))[1]
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.studies s
      WHERE s.branding #>> '{background,image,path}' = so.name
    );
$$;

CREATE OR REPLACE FUNCTION public.cleanup_orphaned_background_storage()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
DECLARE
  deleted_count integer;
BEGIN
  WITH deleted AS (
    DELETE FROM storage.objects
    WHERE id IN (
      SELECT orphan.id
      FROM public.get_orphaned_background_storage_objects() orphan
    )
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;

  RETURN deleted_count;
END;
$$;

-- REVOKE FROM PUBLIC is not enough: Supabase's default privileges grant EXECUTE
-- to anon and authenticated on every new function, and those are explicit role
-- grants that PUBLIC revokes do not touch. Without the two revokes below,
-- cleanup_orphaned_background_storage (SECURITY DEFINER, deletes storage rows)
-- is reachable unauthenticated through PostgREST with the public anon key.
REVOKE ALL ON FUNCTION public.get_orphaned_background_storage_objects() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cleanup_orphaned_background_storage() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_orphaned_background_storage_objects() FROM anon;
REVOKE ALL ON FUNCTION public.cleanup_orphaned_background_storage() FROM anon;
REVOKE ALL ON FUNCTION public.get_orphaned_background_storage_objects() FROM authenticated;
REVOKE ALL ON FUNCTION public.cleanup_orphaned_background_storage() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_orphaned_background_storage_objects() TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_orphaned_background_storage() TO service_role;
