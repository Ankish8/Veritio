-- Add transcription language support
--
-- Allows researchers to specify language for transcription or use auto-detect.
-- Deepgram's auto-detect is excellent, so 'auto' is the recommended default.

-- Add language column to session recording settings (stored in study metadata)
-- This will be used when initializing recordings
COMMENT ON TABLE studies IS 'Studies table with session_recording_settings JSONB field';

-- Add language to recordings table (copied from study settings at recording creation time)
ALTER TABLE recordings
ADD COLUMN IF NOT EXISTS transcription_language TEXT DEFAULT 'auto';

-- Add index for language filtering (analytics: "how many Spanish transcriptions?")
CREATE INDEX IF NOT EXISTS idx_recordings_transcription_language
ON recordings(transcription_language)
WHERE transcription_language IS NOT NULL;

-- Update existing recordings to 'en' (they were hardcoded to English before)
UPDATE recordings
SET transcription_language = 'en'
WHERE transcription_language = 'auto'
AND created_at < NOW();

COMMENT ON COLUMN recordings.transcription_language IS
  'Language for Deepgram transcription. Use "auto" for auto-detection (recommended),
   or specific language code (en, es, fr, de, pt, etc.).
   Auto-detect provides excellent accuracy for most use cases.';
