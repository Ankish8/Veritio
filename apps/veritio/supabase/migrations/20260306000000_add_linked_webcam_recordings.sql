-- Add support for separate webcam recordings linked to screen recordings
-- Enables flexible playback layouts (PiP, side-by-side, etc.)

-- ============================================================================
-- ALTER RECORDINGS TABLE - Add linked recording support
-- ============================================================================

-- Add recording_type to identify primary vs webcam recordings
ALTER TABLE recordings
ADD COLUMN IF NOT EXISTS recording_type TEXT NOT NULL DEFAULT 'primary'
CHECK (recording_type IN ('primary', 'webcam'));

-- Add linked_recording_id to link webcam recordings to screen recordings
ALTER TABLE recordings
ADD COLUMN IF NOT EXISTS linked_recording_id UUID REFERENCES recordings(id) ON DELETE SET NULL;

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_recordings_linked ON recordings(linked_recording_id)
WHERE linked_recording_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_recordings_type ON recordings(recording_type);

CREATE INDEX IF NOT EXISTS idx_recordings_type_linked ON recordings(recording_type, linked_recording_id)
WHERE linked_recording_id IS NOT NULL;

-- Comments
COMMENT ON COLUMN recordings.recording_type IS 'Type of recording: primary (screen+audio) or webcam (camera only)';
COMMENT ON COLUMN recordings.linked_recording_id IS 'For webcam recordings, links to the primary screen recording. NULL for primary recordings or standalone recordings.';

-- ============================================================================
-- VALIDATION CONSTRAINTS
-- ============================================================================

-- Ensure webcam recordings always have a linked primary recording
ALTER TABLE recordings ADD CONSTRAINT webcam_must_be_linked
CHECK (
  recording_type != 'webcam' OR linked_recording_id IS NOT NULL
);

-- Ensure primary recordings don't link to other recordings (only webcam can link)
ALTER TABLE recordings ADD CONSTRAINT primary_cannot_be_linked
CHECK (
  recording_type != 'primary' OR linked_recording_id IS NULL
);

-- Prevent circular references (webcam linking to another webcam)
-- This is enforced at application level since SQL can't check the type of linked recording
COMMENT ON CONSTRAINT webcam_must_be_linked ON recordings IS
'Webcam recordings must always link to a primary recording';
COMMENT ON CONSTRAINT primary_cannot_be_linked ON recordings IS
'Primary recordings cannot have linked_recording_id set';

-- ============================================================================
-- HELPER FUNCTION - Get primary + webcam recordings together
-- ============================================================================

CREATE OR REPLACE FUNCTION get_recording_with_webcam(p_recording_id UUID)
RETURNS TABLE (
  primary_recording recordings,
  webcam_recording recordings
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.*,
    w.*
  FROM recordings r
  LEFT JOIN recordings w ON w.linked_recording_id = r.id AND w.recording_type = 'webcam'
  WHERE r.id = p_recording_id AND r.recording_type = 'primary';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_recording_with_webcam IS
'Fetches a primary recording along with its linked webcam recording (if exists)';
