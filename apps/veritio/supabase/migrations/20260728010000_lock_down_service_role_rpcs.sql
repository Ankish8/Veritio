-- These RPCs are internal backend/maintenance operations. The Supabase anon
-- key is public, so leaving EXECUTE on PUBLIC, anon, or authenticated exposes
-- SECURITY DEFINER functions directly through PostgREST.

-- User study metadata (IDOR when p_user_id is caller-controlled).
-- Some older environments created this function outside the checked-in
-- migration history, so guard the revoke while still applying it everywhere
-- the function exists.
DO $$
BEGIN
  IF to_regprocedure(
    'public.list_user_studies(text,text,text,text,boolean,integer,integer)'
  ) IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.list_user_studies(text, text, text, text, boolean, integer, integer)
      FROM PUBLIC, anon, authenticated;
    GRANT EXECUTE ON FUNCTION public.list_user_studies(text, text, text, text, boolean, integer, integer)
      TO service_role;
  END IF;
END
$$;

-- Destructive maintenance operations.
REVOKE EXECUTE ON FUNCTION public.cleanup_orphaned_storage()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_orphaned_storage()
  TO service_role;

REVOKE EXECUTE ON FUNCTION public.cleanup_orphaned_yjs_documents()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_orphaned_yjs_documents()
  TO service_role;

REVOKE EXECUTE ON FUNCTION public.cleanup_finalized_recording_metadata()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_finalized_recording_metadata()
  TO service_role;

REVOKE EXECUTE ON FUNCTION public.archive_old_recordings()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.archive_old_recordings()
  TO service_role;

REVOKE EXECUTE ON FUNCTION public.archive_abandoned_participants()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.archive_abandoned_participants()
  TO service_role;

REVOKE EXECUTE ON FUNCTION public.create_monthly_partitions(text, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_monthly_partitions(text, integer)
  TO service_role;

REVOKE EXECUTE ON FUNCTION public.refresh_dashboard_materialized_views()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_dashboard_materialized_views()
  TO service_role;

-- Internal metrics and analytics.
REVOKE EXECUTE ON FUNCTION public.get_storage_metrics()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_storage_metrics()
  TO service_role;

REVOKE EXECUTE ON FUNCTION public.get_query_performance_metrics()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_query_performance_metrics()
  TO service_role;

REVOKE EXECUTE ON FUNCTION public.get_link_analytics_summary(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_link_analytics_summary(uuid)
  TO service_role;

REVOKE EXECUTE ON FUNCTION public.get_export_job_progress(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_export_job_progress(uuid)
  TO service_role;

REVOKE EXECUTE ON FUNCTION public.get_orphaned_storage_objects()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_orphaned_storage_objects()
  TO service_role;

-- Reassert the same policy for the background cleanup RPCs. Their creation
-- migration already applies these grants, but keeping all audited RPCs here
-- makes the lockdown complete and easy to review. The existence guards also
-- let this urgent security migration run before the branding migration reaches
-- an environment.
DO $$
BEGIN
  IF to_regprocedure('public.get_orphaned_background_storage_objects()') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.get_orphaned_background_storage_objects()
      FROM PUBLIC, anon, authenticated;
    GRANT EXECUTE ON FUNCTION public.get_orphaned_background_storage_objects()
      TO service_role;
  END IF;

  IF to_regprocedure('public.cleanup_orphaned_background_storage()') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.cleanup_orphaned_background_storage()
      FROM PUBLIC, anon, authenticated;
    GRANT EXECUTE ON FUNCTION public.cleanup_orphaned_background_storage()
      TO service_role;
  END IF;
END
$$;
