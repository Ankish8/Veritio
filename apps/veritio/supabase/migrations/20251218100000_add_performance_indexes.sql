-- Performance Indexes Migration
-- Adds composite indexes for common query patterns to reduce query latency

-- ============================================================================
-- PROJECTS TABLE INDEXES
-- ============================================================================

-- Composite index for ownership verification (id + clerk_user_id)
-- Used in: getProject, updateProject, deleteProject
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_id_user
  ON projects(id, clerk_user_id);

-- ============================================================================
-- STUDIES TABLE INDEXES
-- ============================================================================

-- Composite index for ownership verification (id + clerk_user_id)
-- Used in: getStudy, updateStudy, deleteStudy, studyOwnerMiddleware
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_studies_id_user
  ON studies(id, clerk_user_id);

-- Composite index for listing studies with ownership check via project join
-- Used in: listStudiesByProject (the problematic query)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_studies_project_created
  ON studies(project_id, created_at DESC);

-- ============================================================================
-- PARTICIPANTS TABLE INDEXES
-- ============================================================================

-- Index for counting participants by study (used in aggregate subqueries)
-- Used in: listStudiesByProject participant count
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_participants_study_status
  ON participants(study_id, status);

-- ============================================================================
-- CARDS TABLE INDEXES
-- ============================================================================

-- Composite index for listing cards with position ordering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cards_study_position
  ON cards(study_id, position);

-- ============================================================================
-- CATEGORIES TABLE INDEXES
-- ============================================================================

-- Composite index for listing categories with position ordering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_categories_study_position
  ON categories(study_id, position);

-- ============================================================================
-- TREE_NODES TABLE INDEXES
-- ============================================================================

-- Composite index for listing tree nodes with position ordering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tree_nodes_study_position
  ON tree_nodes(study_id, position);

-- ============================================================================
-- TASKS TABLE INDEXES
-- ============================================================================

-- Composite index for listing tasks with position ordering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_study_position
  ON tasks(study_id, position);

-- ============================================================================
-- RESPONSE TABLES INDEXES (for analytics queries)
-- ============================================================================

-- Card sort responses - used in results analysis
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_card_sort_responses_study_participant
  ON card_sort_responses(study_id, participant_id);

-- Tree test responses - used in results analysis
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tree_test_responses_study_task
  ON tree_test_responses(study_id, task_id);
