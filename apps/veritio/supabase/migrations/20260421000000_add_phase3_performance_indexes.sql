-- Phase 3 Performance Indexes
-- Adds indexes for fingerprint dedupe, dashboard queries, and cleanup jobs

-- ============================================================================
-- PARTICIPANT_FINGERPRINTS TABLE INDEXES
-- ============================================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_participant_fingerprints_study_cookie
  ON participant_fingerprints(study_id, cookie_hash);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_participant_fingerprints_study_ip
  ON participant_fingerprints(study_id, ip_hash);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_participant_fingerprints_study_fp
  ON participant_fingerprints(study_id, fingerprint_hash);

-- ============================================================================
-- PARTICIPANTS TABLE INDEXES
-- ============================================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_participants_study_status
  ON participants(study_id, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_participants_completed_at
  ON participants(completed_at)
  WHERE completed_at IS NOT NULL;

-- ============================================================================
-- RECORDINGS TABLE INDEXES
-- ============================================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recordings_status_started_at
  ON recordings(status, started_at)
  WHERE status IN ('uploading', 'failed');
