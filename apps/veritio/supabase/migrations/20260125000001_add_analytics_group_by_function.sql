-- Phase 1: Analytics GROUP BY RPC
-- Consolidates participant status counts into a single query

CREATE OR REPLACE FUNCTION get_participant_stats(p_study_id UUID)
RETURNS TABLE (status TEXT, count BIGINT)
LANGUAGE plpgsql STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT p.status::TEXT, COUNT(*)::BIGINT
  FROM participants p
  WHERE p.study_id = p_study_id
  GROUP BY p.status;
END;
$$;
