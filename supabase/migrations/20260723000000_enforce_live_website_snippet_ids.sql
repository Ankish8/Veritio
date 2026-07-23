-- Auto Mode and Snippet Mode cannot function without a route-safe snippet ID.
-- Repair existing studies first, then enforce the invariant at the database edge
-- so future application or integration paths cannot persist the broken state.

UPDATE public.studies
SET settings = jsonb_set(
  COALESCE(settings, '{}'::jsonb),
  '{snippetId}',
  to_jsonb(substring(gen_random_uuid()::text FROM 1 FOR 12)),
  true
)
WHERE study_type = 'live_website_test'
  AND COALESCE(settings->>'mode', 'url_only') IN ('reverse_proxy', 'snippet')
  AND (
    COALESCE(settings->>'snippetId', '') = ''
    OR settings->>'snippetId' !~ '^[a-zA-Z0-9_-]{1,64}$'
  );

ALTER TABLE public.studies
  DROP CONSTRAINT IF EXISTS studies_live_website_snippet_id_valid;

ALTER TABLE public.studies
  ADD CONSTRAINT studies_live_website_snippet_id_valid
  CHECK (
    study_type <> 'live_website_test'
    OR COALESCE(settings->>'mode', 'url_only') NOT IN ('reverse_proxy', 'snippet')
    OR COALESCE(settings->>'snippetId', '') ~ '^[a-zA-Z0-9_-]{1,64}$'
  );
