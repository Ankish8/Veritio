-- Optimize study_flow_responses RLS policies to reduce COPY overhead
-- Issue: Complex RLS policies causing 4.6s COPY times due to row-by-row evaluation

-- ============================================================================
-- PROBLEM ANALYSIS
-- ============================================================================
-- Current INSERT policy performs for EACH row:
--   1. Participant lookup with session_token check
--   2. JSON parsing of request headers
--   3. current_setting() function call
--
-- Current SELECT policy performs for EACH row:
--   1. 3-table JOIN (studies -> projects -> organization_members)
--   2. Subquery execution
--
-- Solution: Add indexes to support the subquery patterns used in RLS policies
-- ============================================================================

-- ============================================================================
-- ADD INDEXES TO OPTIMIZE RLS POLICY LOOKUPS
-- ============================================================================

-- Speed up participant session token lookups (used in INSERT policy)
-- This index helps the EXISTS check in the INSERT policy
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_participants_session_study
  ON participants(session_token, study_id, id)
  WHERE session_token IS NOT NULL;

-- Speed up study ownership lookups (used in SELECT policy)
-- Covers the studies -> projects JOIN
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_studies_project_id
  ON studies(project_id, id);

-- Speed up organization member lookups (used in SELECT policy)
-- Covers organization_members checks
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_org_members_org_user
  ON organization_members(organization_id, user_id)
  WHERE joined_at IS NOT NULL;

-- ============================================================================
-- OPTIMIZE RLS POLICIES WITH BETTER QUERY PLANS
-- ============================================================================

-- Replace INSERT policy with optimized version
DROP POLICY IF EXISTS "Participants can insert flow responses" ON study_flow_responses;

CREATE POLICY "Participants can insert flow responses"
  ON study_flow_responses FOR INSERT
  TO authenticated, anon
  WITH CHECK (
    -- Optimized: Use indexed lookup on participants table
    EXISTS (
      SELECT 1
      FROM participants p
      WHERE p.id = study_flow_responses.participant_id
        AND p.study_id = study_flow_responses.study_id
        AND p.session_token = current_setting('request.headers', true)::json->>'x-session-token'
    )
  );

-- Replace SELECT policy with optimized version
DROP POLICY IF EXISTS "Study owners can read flow responses" ON study_flow_responses;

CREATE POLICY "Study owners can read flow responses"
  ON study_flow_responses FOR SELECT
  TO authenticated
  USING (
    -- Optimized: Use indexes and reduce JOIN complexity
    study_id IN (
      SELECT s.id
      FROM studies s
      INNER JOIN projects p ON s.project_id = p.id
      LEFT JOIN organization_members om
        ON p.organization_id = om.organization_id
        AND om.joined_at IS NOT NULL
      WHERE p.user_id = current_setting('request.jwt.claims', true)::json->>'sub'
         OR om.user_id = current_setting('request.jwt.claims', true)::json->>'sub'
    )
  );

-- ============================================================================
-- ANALYZE TABLES TO UPDATE STATISTICS
-- ============================================================================

-- Update query planner statistics for better execution plans
ANALYZE participants;
ANALYZE study_flow_responses;
ANALYZE studies;
ANALYZE projects;
ANALYZE organization_members;

-- ============================================================================
-- NOTES
-- ============================================================================
-- 1. CONCURRENTLY keyword prevents table locking during index creation
-- 2. Partial indexes on non-NULL values reduce index size
-- 3. Covering indexes (multi-column) eliminate table lookups
-- 4. ANALYZE updates statistics for query planner optimization
--
-- Expected improvements:
-- - INSERT policy: 50-70% faster (indexed session_token lookup)
-- - SELECT policy: 40-60% faster (indexed JOINs)
-- - COPY operations: Should drop from ~4600ms to <1000ms
--
-- Monitor with:
--   SELECT * FROM pg_stat_statements WHERE query LIKE '%study_flow_responses%'
--   ORDER BY mean_exec_time DESC LIMIT 10;
