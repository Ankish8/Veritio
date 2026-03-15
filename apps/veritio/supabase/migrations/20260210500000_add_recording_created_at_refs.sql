-- Phase 3: Add recording_created_at references for partitioned recordings

-- Add recording_created_at to dependent tables
ALTER TABLE IF EXISTS recordings
  ADD COLUMN IF NOT EXISTS linked_recording_created_at TIMESTAMPTZ;

ALTER TABLE IF EXISTS transcripts
  ADD COLUMN IF NOT EXISTS recording_created_at TIMESTAMPTZ;
ALTER TABLE IF EXISTS recording_events
  ADD COLUMN IF NOT EXISTS recording_created_at TIMESTAMPTZ;
ALTER TABLE IF EXISTS recording_clips
  ADD COLUMN IF NOT EXISTS recording_created_at TIMESTAMPTZ;
ALTER TABLE IF EXISTS recording_comments
  ADD COLUMN IF NOT EXISTS recording_created_at TIMESTAMPTZ;
ALTER TABLE IF EXISTS recording_shares
  ADD COLUMN IF NOT EXISTS recording_created_at TIMESTAMPTZ;
ALTER TABLE IF EXISTS recording_annotations
  ADD COLUMN IF NOT EXISTS recording_created_at TIMESTAMPTZ;
ALTER TABLE IF EXISTS recording_track_configs
  ADD COLUMN IF NOT EXISTS recording_created_at TIMESTAMPTZ;

-- Backfill from recordings table
UPDATE transcripts t
SET recording_created_at = r.created_at
FROM recordings r
WHERE t.recording_id = r.id
  AND t.recording_created_at IS NULL;

UPDATE recording_events e
SET recording_created_at = r.created_at
FROM recordings r
WHERE e.recording_id = r.id
  AND e.recording_created_at IS NULL;

UPDATE recording_clips c
SET recording_created_at = r.created_at
FROM recordings r
WHERE c.recording_id = r.id
  AND c.recording_created_at IS NULL;

UPDATE recording_comments c
SET recording_created_at = r.created_at
FROM recordings r
WHERE c.recording_id = r.id
  AND c.recording_created_at IS NULL;

UPDATE recording_shares s
SET recording_created_at = r.created_at
FROM recordings r
WHERE s.recording_id = r.id
  AND s.recording_created_at IS NULL;

UPDATE recording_annotations a
SET recording_created_at = r.created_at
FROM recordings r
WHERE a.recording_id = r.id
  AND a.recording_created_at IS NULL;

UPDATE recording_track_configs t
SET recording_created_at = r.created_at
FROM recordings r
WHERE t.recording_id = r.id
  AND t.recording_created_at IS NULL;

-- Backfill linked_recording_created_at on recordings
UPDATE recordings r
SET linked_recording_created_at = linked.created_at
FROM recordings linked
WHERE r.linked_recording_id = linked.id
  AND r.linked_recording_created_at IS NULL;

-- Enforce NOT NULL after backfill
ALTER TABLE IF EXISTS transcripts
  ALTER COLUMN recording_created_at SET NOT NULL;
ALTER TABLE IF EXISTS recording_events
  ALTER COLUMN recording_created_at SET NOT NULL;
ALTER TABLE IF EXISTS recording_clips
  ALTER COLUMN recording_created_at SET NOT NULL;
ALTER TABLE IF EXISTS recording_comments
  ALTER COLUMN recording_created_at SET NOT NULL;
ALTER TABLE IF EXISTS recording_shares
  ALTER COLUMN recording_created_at SET NOT NULL;
ALTER TABLE IF EXISTS recording_annotations
  ALTER COLUMN recording_created_at SET NOT NULL;
ALTER TABLE IF EXISTS recording_track_configs
  ALTER COLUMN recording_created_at SET NOT NULL;

-- Trigger to populate recording_created_at on insert/update
CREATE OR REPLACE FUNCTION set_recording_created_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.recording_created_at IS NULL THEN
    SELECT created_at INTO NEW.recording_created_at
    FROM recordings
    WHERE id = NEW.recording_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to populate linked_recording_created_at on recordings
CREATE OR REPLACE FUNCTION set_linked_recording_created_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.linked_recording_id IS NULL THEN
    NEW.linked_recording_created_at = NULL;
    RETURN NEW;
  END IF;

  SELECT created_at INTO NEW.linked_recording_created_at
  FROM recordings
  WHERE id = NEW.linked_recording_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_linked_recording_created_at_recordings ON recordings;
CREATE TRIGGER set_linked_recording_created_at_recordings
  BEFORE INSERT OR UPDATE OF linked_recording_id ON recordings
  FOR EACH ROW EXECUTE FUNCTION set_linked_recording_created_at();

DROP TRIGGER IF EXISTS set_recording_created_at_transcripts ON transcripts;
CREATE TRIGGER set_recording_created_at_transcripts
  BEFORE INSERT OR UPDATE OF recording_id ON transcripts
  FOR EACH ROW EXECUTE FUNCTION set_recording_created_at();

DROP TRIGGER IF EXISTS set_recording_created_at_events ON recording_events;
CREATE TRIGGER set_recording_created_at_events
  BEFORE INSERT OR UPDATE OF recording_id ON recording_events
  FOR EACH ROW EXECUTE FUNCTION set_recording_created_at();

DROP TRIGGER IF EXISTS set_recording_created_at_clips ON recording_clips;
CREATE TRIGGER set_recording_created_at_clips
  BEFORE INSERT OR UPDATE OF recording_id ON recording_clips
  FOR EACH ROW EXECUTE FUNCTION set_recording_created_at();

DROP TRIGGER IF EXISTS set_recording_created_at_comments ON recording_comments;
CREATE TRIGGER set_recording_created_at_comments
  BEFORE INSERT OR UPDATE OF recording_id ON recording_comments
  FOR EACH ROW EXECUTE FUNCTION set_recording_created_at();

DROP TRIGGER IF EXISTS set_recording_created_at_shares ON recording_shares;
CREATE TRIGGER set_recording_created_at_shares
  BEFORE INSERT OR UPDATE OF recording_id ON recording_shares
  FOR EACH ROW EXECUTE FUNCTION set_recording_created_at();

DROP TRIGGER IF EXISTS set_recording_created_at_annotations ON recording_annotations;
CREATE TRIGGER set_recording_created_at_annotations
  BEFORE INSERT OR UPDATE OF recording_id ON recording_annotations
  FOR EACH ROW EXECUTE FUNCTION set_recording_created_at();

DROP TRIGGER IF EXISTS set_recording_created_at_track_configs ON recording_track_configs;
CREATE TRIGGER set_recording_created_at_track_configs
  BEFORE INSERT OR UPDATE OF recording_id ON recording_track_configs
  FOR EACH ROW EXECUTE FUNCTION set_recording_created_at();
