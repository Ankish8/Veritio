-- ================================================================
-- Migration: Add Skip Tracking to Tree Test Responses
-- Description: Adds is_skipped column to track when participants skip tasks
-- Supports: Task Results analytics with skip rate metrics
-- ================================================================

-- ================================================================
-- 1. Add is_skipped column to tree_test_responses
-- ================================================================
ALTER TABLE tree_test_responses
  ADD COLUMN IF NOT EXISTS is_skipped BOOLEAN DEFAULT FALSE;

-- ================================================================
-- 2. Add index for efficient skip filtering
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_tree_test_responses_is_skipped
  ON tree_test_responses(is_skipped)
  WHERE is_skipped = TRUE;

-- ================================================================
-- 3. Comments for documentation
-- ================================================================
COMMENT ON COLUMN tree_test_responses.is_skipped IS 'True if participant chose to skip this task instead of answering';
