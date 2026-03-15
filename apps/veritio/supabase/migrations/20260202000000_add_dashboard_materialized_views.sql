-- Phase 2: Materialized views for dashboard stats

CREATE MATERIALIZED VIEW mv_organization_dashboard_stats AS
SELECT
  o.id as organization_id,
  COUNT(DISTINCT p.id) as total_projects,
  COUNT(DISTINCT s.id) as total_studies,
  COUNT(DISTINCT s.id) FILTER (WHERE s.status = 'active') as active_studies,
  COUNT(DISTINCT part.id) FILTER (WHERE part.status = 'completed') as total_participants,
  MAX(s.updated_at) as last_activity_at
FROM organizations o
LEFT JOIN projects p ON o.id = p.organization_id AND p.is_archived = false
LEFT JOIN studies s ON s.organization_id = o.id AND s.is_archived = false
LEFT JOIN participants part ON s.id = part.study_id
GROUP BY o.id;

-- Unique index for concurrent refresh
CREATE UNIQUE INDEX idx_mv_org_dashboard_stats_org
  ON mv_organization_dashboard_stats(organization_id);

-- Refresh function (called by cron)
CREATE OR REPLACE FUNCTION refresh_dashboard_materialized_views() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_organization_dashboard_stats;
END;
$$;
