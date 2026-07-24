-- get_study_participant_stats: set-based replacement for the
-- fetch-every-participant-row-and-count-in-JS logic in get-study-stats.step.ts.
-- Semantics mirrored exactly:
--   * status buckets: completed / in_progress / abandoned / screened_out
--   * completionRate: round(completed/total*100), 0 when no participants
--   * averageDurationSeconds: round(avg(completed_at - started_at)) over
--     completed rows with both timestamps, null when none
--   * responsesByDay: last 30 days (rolling from now()), bucketed by UTC date
--     (matches JS toISOString().split('T')[0]), ascending
CREATE OR REPLACE FUNCTION get_study_participant_stats(p_study_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
  SELECT jsonb_build_object(
    'participantStats', jsonb_build_object(
      'total', count(*),
      'completed', count(*) FILTER (WHERE status = 'completed'),
      'inProgress', count(*) FILTER (WHERE status = 'in_progress'),
      'abandoned', count(*) FILTER (WHERE status = 'abandoned'),
      'screened', count(*) FILTER (WHERE status = 'screened_out')
    ),
    'completionRate', CASE
      WHEN count(*) > 0
      THEN round((count(*) FILTER (WHERE status = 'completed'))::numeric / count(*) * 100)::int
      ELSE 0
    END,
    'averageDurationSeconds', (
      SELECT round(avg(extract(epoch FROM (completed_at - started_at))))::int
      FROM participants
      WHERE study_id = p_study_id
        AND status = 'completed'
        AND started_at IS NOT NULL
        AND completed_at IS NOT NULL
    ),
    'responsesByDay', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('date', d.date, 'count', d.count) ORDER BY d.date)
      FROM (
        SELECT to_char(started_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS date, count(*)::int AS count
        FROM participants
        WHERE study_id = p_study_id
          AND started_at IS NOT NULL
          AND started_at >= now() - interval '30 days'
        GROUP BY 1
      ) d
    ), '[]'::jsonb)
  )
  FROM participants
  WHERE study_id = p_study_id;
$$;

-- Backend-only helper (service_role); not for anon/authenticated via PostgREST.
REVOKE EXECUTE ON FUNCTION get_study_participant_stats(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION get_study_participant_stats(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION get_study_participant_stats(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION get_study_participant_stats(uuid) TO service_role;
