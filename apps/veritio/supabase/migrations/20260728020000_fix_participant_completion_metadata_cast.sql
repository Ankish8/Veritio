-- Migration: unbreak participant completion
--
-- complete_participant_if_under_response_cap wrote the metadata column with
--   metadata = CASE WHEN p_metadata IS NULL THEN metadata
--                   ELSE (current_metadata || p_metadata)::json END
-- participants.metadata is jsonb, so the two CASE branches have incompatible
-- types (jsonb vs json) and Postgres rejects the statement at parse time with
-- "CASE/WHEN could not convert type jsonb to json". The value of p_metadata is
-- irrelevant: every call failed, so every participant submission returned 500
-- after its response row had already been inserted.
--
-- Both branches are jsonb now; no cast is needed.

CREATE OR REPLACE FUNCTION complete_participant_if_under_response_cap(
  p_participant_id uuid,
  p_response_cap integer DEFAULT NULL,
  p_metadata jsonb DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_study_id uuid;
  target_status text;
  current_metadata jsonb;
  completed_count integer;
BEGIN
  SELECT study_id
    INTO target_study_id
    FROM participants
   WHERE id = p_participant_id;

  IF target_study_id IS NULL THEN
    RETURN 'not_found';
  END IF;

  -- Serialize completions for the same study so the count and update are one
  -- logical operation under concurrency.
  PERFORM 1
    FROM studies
   WHERE id = target_study_id
   FOR UPDATE;

  SELECT status, COALESCE(metadata, '{}'::jsonb)
    INTO target_status, current_metadata
    FROM participants
   WHERE id = p_participant_id
   FOR UPDATE;

  IF target_status = 'completed' THEN
    RETURN 'already_completed';
  END IF;

  IF p_response_cap IS NOT NULL AND p_response_cap >= 0 THEN
    SELECT COUNT(*)
      INTO completed_count
      FROM participants
     WHERE study_id = target_study_id
       AND status = 'completed';

    IF completed_count >= p_response_cap THEN
      RETURN 'response_limit_reached';
    END IF;
  END IF;

  UPDATE participants
     SET status = 'completed',
         completed_at = now(),
         metadata = CASE
           WHEN p_metadata IS NULL THEN metadata
           ELSE current_metadata || p_metadata
         END
   WHERE id = p_participant_id;

  RETURN 'completed';
END;
$$;

-- CREATE OR REPLACE keeps the existing ACL; restate it so a from-scratch
-- database ends up with the same service_role-only access.
REVOKE EXECUTE ON FUNCTION public.complete_participant_if_under_response_cap(uuid, integer, jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_participant_if_under_response_cap(uuid, integer, jsonb)
  TO service_role;
