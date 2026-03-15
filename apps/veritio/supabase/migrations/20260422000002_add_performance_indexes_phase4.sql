-- Phase 4 Performance Indexes
-- Adds indexes for high-traffic queries (sessions, studies, participants, recordings, collaboration)

-- ============================================================================
-- SESSIONS TABLE (AUTH) INDEXES
-- ============================================================================
-- Note: Partial indexes cannot use NOW() since it is not immutable.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_user_expires_active
  ON sessions(user_id, expires_at DESC);

-- ============================================================================
-- STUDIES TABLE INDEXES
-- ============================================================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_studies_user_created_active
  ON studies(user_id, created_at DESC)
  WHERE is_archived = false;

-- Studies are scoped by project for org access
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_studies_project_created_active
  ON studies(project_id, created_at DESC)
  WHERE is_archived = false;

-- ============================================================================
-- PARTICIPANTS TABLE INDEXES
-- ============================================================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_participants_started_incomplete
  ON participants(started_at DESC)
  WHERE completed_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_participants_study_started
  ON participants(study_id, started_at DESC);

-- ============================================================================
-- RECORDINGS TABLE INDEXES
-- ============================================================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recordings_completed_transcription_queue
  ON recordings(study_id, status, created_at)
  WHERE status = 'completed';

-- ============================================================================
-- YJS DOCUMENTS TABLE INDEXES
-- ============================================================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_yjs_documents_study_updated
  ON yjs_documents ((split_part(doc_name, ':', 2)), updated_at DESC);

-- ============================================================================
-- SURVEY RESPONSES TABLE INDEXES
-- ============================================================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_survey_responses_study_question
  ON survey_responses(study_id, question_id, created_at DESC);

-- ============================================================================
-- ORGANIZATION MEMBERS TABLE INDEXES
-- ============================================================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_org_members_user_active
  ON organization_members(user_id, organization_id)
  WHERE joined_at IS NOT NULL;

-- ============================================================================
-- PROJECTS TABLE INDEXES
-- ============================================================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_org_user
  ON projects(organization_id, user_id)
  WHERE is_archived = false;
