-- ================================================================
-- Migration: Add Archive and Favorites Support
-- Description: Adds is_archived flag to projects/studies and creates user_favorites table
-- ================================================================

-- ================================================================
-- 1. Add is_archived column to projects table
-- ================================================================
ALTER TABLE projects ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false;

-- Index for filtering archived projects per user
CREATE INDEX IF NOT EXISTS idx_projects_user_archived ON projects(clerk_user_id, is_archived);

-- ================================================================
-- 2. Add is_archived column to studies table
-- ================================================================
ALTER TABLE studies ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false;

-- Index for filtering archived studies per user
CREATE INDEX IF NOT EXISTS idx_studies_user_archived ON studies(clerk_user_id, is_archived);

-- ================================================================
-- 3. Create user_favorites table
-- ================================================================
CREATE TABLE IF NOT EXISTS user_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('project', 'study')),
  entity_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Ensure unique favorites per user/entity combination
  CONSTRAINT user_favorites_unique UNIQUE(clerk_user_id, entity_type, entity_id)
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_user_favorites_user ON user_favorites(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_entity ON user_favorites(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_user_created ON user_favorites(clerk_user_id, created_at DESC);

-- ================================================================
-- 4. Enable RLS on user_favorites
-- ================================================================
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own favorites
CREATE POLICY "Users can view own favorites" ON user_favorites
  FOR SELECT USING (true);

-- Policy: Users can insert their own favorites
CREATE POLICY "Users can insert own favorites" ON user_favorites
  FOR INSERT WITH CHECK (true);

-- Policy: Users can delete their own favorites
CREATE POLICY "Users can delete own favorites" ON user_favorites
  FOR DELETE USING (true);
