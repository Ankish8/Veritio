-- ================================================================
-- Migration: Add Figma File Modified Date
-- Description: Tracks when the Figma file was last modified
--              Used to show sync status indicator in UI
-- ================================================================

-- Add figma_file_modified_at column to track Figma's lastModified
ALTER TABLE prototype_test_prototypes
ADD COLUMN IF NOT EXISTS figma_file_modified_at TIMESTAMPTZ;

COMMENT ON COLUMN prototype_test_prototypes.figma_file_modified_at IS 'Last modified timestamp from Figma API. Compare with last_synced_at to detect changes.';
