-- Phase 1: Quick Win Indexes (No Downtime)
-- Adds missing indexes for dashboard queries, storage, and cleanup jobs

-- ============================================================================
-- PROJECTS TABLE INDEXES
-- ============================================================================

-- Organization-based filtering (most critical!)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_org_created
  ON projects(organization_id, created_at DESC)
  WHERE is_archived = false;

-- ============================================================================
-- PARTICIPANTS TABLE INDEXES
-- ============================================================================

-- Dashboard weekly insights (completed participants by study/date)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_participants_study_completed_at
  ON participants(study_id, completed_at DESC)
  WHERE status = 'completed' AND completed_at IS NOT NULL;

-- ============================================================================
-- RECORDINGS TABLE INDEXES
-- ============================================================================

-- Recording storage tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recordings_storage_size
  ON recordings(study_id, file_size_bytes)
  WHERE status IN ('ready', 'completed') AND deleted_at IS NULL;

-- ============================================================================
-- YJS DOCUMENTS TABLE INDEXES
-- ============================================================================

-- Yjs document cleanup queries (size + recency)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_yjs_documents_size_updated
  ON yjs_documents(octet_length(state), updated_at DESC);
