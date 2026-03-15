-- Phase 2: Storage tracking columns for recordings

ALTER TABLE recordings
  ADD COLUMN IF NOT EXISTS total_storage_bytes BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS chunk_etags_size_bytes BIGINT DEFAULT 0;

-- Backfill existing data
UPDATE recordings SET
  total_storage_bytes = COALESCE(file_size_bytes, 0),
  chunk_etags_size_bytes = COALESCE(pg_column_size(chunk_etags), 0)
WHERE total_storage_bytes = 0;

-- Auto-update trigger
CREATE OR REPLACE FUNCTION update_recording_storage_size() RETURNS TRIGGER AS $$
BEGIN
  NEW.chunk_etags_size_bytes = COALESCE(pg_column_size(NEW.chunk_etags), 0);
  NEW.total_storage_bytes = COALESCE(NEW.file_size_bytes, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS recordings_update_storage_size ON recordings;

CREATE TRIGGER recordings_update_storage_size
  BEFORE INSERT OR UPDATE OF file_size_bytes, chunk_etags ON recordings
  FOR EACH ROW EXECUTE FUNCTION update_recording_storage_size();

-- Index for monitoring queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recordings_storage_tracking
  ON recordings(study_id, total_storage_bytes DESC) WHERE deleted_at IS NULL;
