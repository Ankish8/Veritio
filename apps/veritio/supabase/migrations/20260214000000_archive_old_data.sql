-- Phase 3: Archive old recordings and participants

CREATE TABLE IF NOT EXISTS recordings_archived (LIKE recordings INCLUDING ALL);
CREATE TABLE IF NOT EXISTS participants_archived (LIKE participants INCLUDING ALL);

CREATE OR REPLACE FUNCTION archive_old_recordings()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE archived_count integer;
BEGIN
  WITH archived AS (
    DELETE FROM recordings
    WHERE deleted_at < NOW() - INTERVAL '90 days'
    RETURNING *
  )
  INSERT INTO recordings_archived SELECT * FROM archived;

  GET DIAGNOSTICS archived_count = ROW_COUNT;
  RETURN archived_count;
END;
$$;

CREATE OR REPLACE FUNCTION archive_abandoned_participants()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE archived_count integer;
BEGIN
  WITH archived AS (
    DELETE FROM participants
    WHERE status = 'abandoned'
      AND started_at < NOW() - INTERVAL '30 days'
    RETURNING *
  )
  INSERT INTO participants_archived SELECT * FROM archived;

  GET DIAGNOSTICS archived_count = ROW_COUNT;
  RETURN archived_count;
END;
$$;
