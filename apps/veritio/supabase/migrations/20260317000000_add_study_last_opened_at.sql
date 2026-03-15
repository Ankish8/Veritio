-- Migration: Add last_opened_at column to studies table
-- Purpose: Track when users last opened/viewed a study for "Recently Opened" functionality

-- Add the column with a default value of null (existing studies haven't been "opened" yet)
ALTER TABLE studies
ADD COLUMN IF NOT EXISTS last_opened_at TIMESTAMPTZ DEFAULT NULL;

-- Create an index for efficient sorting by last_opened_at
-- This index is partial - only indexes rows where last_opened_at is not null
-- for better performance when sorting by recently opened
CREATE INDEX IF NOT EXISTS idx_studies_last_opened_at
ON studies (user_id, last_opened_at DESC NULLS LAST)
WHERE is_archived = false;

-- Add a comment explaining the column's purpose
COMMENT ON COLUMN studies.last_opened_at IS 'Timestamp of when the user last opened/viewed this study in the dashboard';
