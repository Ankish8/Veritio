-- Enhanced Clip Features: Tags, Thumbnails, and Predefined Tags
-- Adds support for clip categorization and visual previews

-- ============================================================================
-- ADD TAGS AND THUMBNAIL COLUMNS TO RECORDING_CLIPS
-- ============================================================================

ALTER TABLE recording_clips
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
  ADD COLUMN IF NOT EXISTS thumbnail_storage_path TEXT;

-- Create GIN index for efficient tag queries
CREATE INDEX IF NOT EXISTS idx_recording_clips_tags ON recording_clips USING GIN(tags);

COMMENT ON COLUMN recording_clips.tags IS 'Array of tags/labels for categorization (e.g., ["Key Insight", "Usability Issue"])';
COMMENT ON COLUMN recording_clips.thumbnail_url IS 'Public URL for clip thumbnail image (320x180 JPEG)';
COMMENT ON COLUMN recording_clips.thumbnail_storage_path IS 'Supabase storage path for thumbnail (for deletion on clip delete)';

-- ============================================================================
-- ADD PREDEFINED CLIP TAGS TO STUDIES TABLE
-- ============================================================================

ALTER TABLE studies
  ADD COLUMN IF NOT EXISTS predefined_clip_tags TEXT[] DEFAULT ARRAY[
    'Key Insight',
    'Usability Issue',
    'Pain Point',
    'Success Moment',
    'Confusion',
    'Feature Request',
    'Quote'
  ];

COMMENT ON COLUMN studies.predefined_clip_tags IS 'Predefined tags available for clips in this study. Users can also add custom tags.';

-- ============================================================================
-- CREATE STORAGE BUCKET FOR CLIP THUMBNAILS (IF NOT EXISTS)
-- ============================================================================

-- Note: Storage bucket creation is typically done via Supabase dashboard or CLI
-- This is documented here for reference:
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('clip-thumbnails', 'clip-thumbnails', true)
-- ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- RLS POLICY FOR THUMBNAIL STORAGE (Reference)
-- ============================================================================

-- Storage policies should be configured in Supabase dashboard:
-- - Allow authenticated users to upload to clip-thumbnails bucket
-- - Allow public read access to clip-thumbnails bucket
-- - Path pattern: {study_id}/{recording_id}/{clip_id}.jpg
