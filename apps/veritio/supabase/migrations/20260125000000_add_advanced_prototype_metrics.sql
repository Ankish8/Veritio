-- ============================================================================
-- Phase 4: Advanced Prototype Metrics
-- ============================================================================
-- Adds caching columns for Lostness and Path Efficiency scores,
-- and creates a materialized view for frame dwell time aggregation.
--
-- Per Q23 decision: Cache both metrics for performance optimization.
-- ============================================================================

-- 1. Cache computed metrics on task attempts
-- Lostness: 0-1 scale (3 decimal precision sufficient)
-- Path Efficiency: 0-100 scale (2 decimal precision sufficient)
ALTER TABLE prototype_test_task_attempts
ADD COLUMN IF NOT EXISTS lostness_score DECIMAL(4,3),
ADD COLUMN IF NOT EXISTS path_efficiency_score DECIMAL(5,2);

-- Add index for efficient querying of attempts with computed metrics
CREATE INDEX IF NOT EXISTS idx_task_attempts_computed_metrics
ON prototype_test_task_attempts(study_id, task_id, lostness_score, path_efficiency_score)
WHERE lostness_score IS NOT NULL OR path_efficiency_score IS NOT NULL;

-- 2. Create materialized view for frame dwell time statistics
-- This aggregates navigation events to compute per-frame dwell time stats
-- Used for identifying confusion points (frames where dwell time > 2x average)
CREATE MATERIALIZED VIEW IF NOT EXISTS prototype_test_frame_dwell_stats AS
SELECT
    ne.study_id,
    ne.task_id,
    ne.from_frame_id AS frame_id,
    COUNT(*) AS visit_count,
    ROUND(AVG(ne.time_on_from_frame_ms)::numeric, 2) AS avg_dwell_time_ms,
    ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ne.time_on_from_frame_ms)::numeric, 2) AS median_dwell_time_ms,
    ROUND(PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY ne.time_on_from_frame_ms)::numeric, 2) AS p90_dwell_time_ms,
    MIN(ne.time_on_from_frame_ms) AS min_dwell_time_ms,
    MAX(ne.time_on_from_frame_ms) AS max_dwell_time_ms
FROM prototype_test_navigation_events ne
WHERE ne.from_frame_id IS NOT NULL
  AND ne.time_on_from_frame_ms IS NOT NULL
  AND ne.time_on_from_frame_ms > 0
GROUP BY ne.study_id, ne.task_id, ne.from_frame_id;

-- Create unique index for concurrent refresh capability
CREATE UNIQUE INDEX IF NOT EXISTS idx_frame_dwell_stats_unique
ON prototype_test_frame_dwell_stats(study_id, task_id, frame_id);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_frame_dwell_stats_study_task
ON prototype_test_frame_dwell_stats(study_id, task_id);

-- 3. Add index on navigation events for efficient dwell stats computation
CREATE INDEX IF NOT EXISTS idx_prototype_nav_dwell_stats
ON prototype_test_navigation_events(study_id, task_id, from_frame_id)
WHERE from_frame_id IS NOT NULL
  AND time_on_from_frame_ms IS NOT NULL
  AND time_on_from_frame_ms > 0;

-- 4. Function to refresh dwell stats for a specific study
-- Call this after new navigation events are recorded
CREATE OR REPLACE FUNCTION refresh_prototype_test_frame_dwell_stats(p_study_id UUID)
RETURNS void AS $$
BEGIN
    -- Concurrently refresh the materialized view
    -- Note: CONCURRENTLY requires a unique index (created above)
    REFRESH MATERIALIZED VIEW CONCURRENTLY prototype_test_frame_dwell_stats;
END;
$$ LANGUAGE plpgsql;

-- 5. Add comments for documentation
COMMENT ON COLUMN prototype_test_task_attempts.lostness_score IS
    'Lostness score (Smith 1996) computed from path taken. Scale: 0 (direct) to 1 (lost). Thresholds: 0-0.3=On Track, 0.3-0.6=Mild Confusion, 0.6+=Lost';

COMMENT ON COLUMN prototype_test_task_attempts.path_efficiency_score IS
    'Path efficiency composite score (0-100). Weighted: Adherence 40%, Extra Steps 20%, Backtracks 30%, Time 10%';

COMMENT ON MATERIALIZED VIEW prototype_test_frame_dwell_stats IS
    'Aggregated frame-level dwell time statistics for confusion point detection. Refresh with refresh_prototype_test_frame_dwell_stats(study_id)';
