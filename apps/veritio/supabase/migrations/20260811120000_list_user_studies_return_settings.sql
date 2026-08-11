-- list_user_studies: return the study settings blob.
--
-- `live_website_test` backs two products in the study picker — "Website
-- Prototype Test" (Auto Mode) and "Web App Test" (Snippet Mode). They share a
-- study_type, so the only way a list can label them apart is the tracking mode
-- inside settings. Without it the all-studies table calls every live website
-- study a "Web App Test", including the ones created from the prototype card.
--
-- The return type changes, so the function has to be dropped and recreated;
-- CREATE OR REPLACE cannot alter RETURNS TABLE. The body is otherwise identical
-- to the previous definition.

DROP FUNCTION IF EXISTS public.list_user_studies(text, text, text, text, boolean, integer, integer);

CREATE FUNCTION public.list_user_studies(
  p_user_id text,
  p_study_type text DEFAULT NULL::text,
  p_status text DEFAULT NULL::text,
  p_search text DEFAULT NULL::text,
  p_archived boolean DEFAULT false,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  id uuid,
  title text,
  description text,
  study_type text,
  status text,
  user_id text,
  is_archived boolean,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  launched_at timestamp with time zone,
  project_id uuid,
  project_name text,
  settings jsonb,
  participant_count bigint,
  total_count bigint
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $function$
DECLARE
  v_total_count BIGINT;
BEGIN
  -- First, get the total count for pagination
  SELECT COUNT(DISTINCT s.id)
  INTO v_total_count
  FROM studies s
  INNER JOIN projects p ON s.project_id = p.id
  INNER JOIN organization_members om ON p.organization_id = om.organization_id
  WHERE om.user_id = p_user_id
    AND om.joined_at IS NOT NULL
    AND s.is_archived = p_archived
    AND (p_study_type IS NULL OR s.study_type = p_study_type)
    AND (p_status IS NULL OR s.status = p_status)
    AND (p_search IS NULL OR s.title ILIKE '%' || p_search || '%');

  -- Return the paginated results with participant counts
  RETURN QUERY
  SELECT
    s.id,
    s.title,
    s.description,
    s.study_type,
    s.status,
    s.user_id,
    s.is_archived,
    s.created_at,
    s.updated_at,
    s.launched_at,
    s.project_id,
    p.name AS project_name,
    s.settings,
    COALESCE(pc.participant_count, 0) AS participant_count,
    v_total_count AS total_count
  FROM studies s
  INNER JOIN projects p ON s.project_id = p.id
  INNER JOIN organization_members om ON p.organization_id = om.organization_id
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS participant_count
    FROM participants pt
    WHERE pt.study_id = s.id
  ) pc ON TRUE
  WHERE om.user_id = p_user_id
    AND om.joined_at IS NOT NULL
    AND s.is_archived = p_archived
    AND (p_study_type IS NULL OR s.study_type = p_study_type)
    AND (p_status IS NULL OR s.status = p_status)
    AND (p_search IS NULL OR s.title ILIKE '%' || p_search || '%')
  GROUP BY s.id, s.title, s.description, s.study_type, s.status, s.user_id,
           s.is_archived, s.created_at, s.updated_at, s.launched_at, s.project_id,
           p.name, s.settings, pc.participant_count
  ORDER BY s.updated_at DESC NULLS LAST
  LIMIT p_limit
  OFFSET p_offset;
END;
$function$;
