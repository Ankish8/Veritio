-- Migration: Add participant fingerprints table for duplicate response prevention
-- This table stores hashed fingerprints to detect and prevent duplicate study participation

-- Create the participant_fingerprints table
CREATE TABLE IF NOT EXISTS participant_fingerprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id UUID NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,

  -- Fingerprint data (hashed for privacy)
  cookie_hash TEXT,           -- SHA-256 hash of tracking cookie
  ip_hash TEXT,               -- SHA-256 hash of IP address
  fingerprint_hash TEXT,      -- SHA-256 hash of browser fingerprint (FingerprintJS)
  fingerprint_confidence DECIMAL(3,2),  -- FingerprintJS confidence score (0.00-1.00)

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- One fingerprint record per participant
  UNIQUE(participant_id)
);

-- Indexes for fast duplicate detection queries
-- Index for relaxed level (cookie only)
CREATE INDEX idx_fingerprints_study_cookie ON participant_fingerprints(study_id, cookie_hash);

-- Index for moderate level (IP tracking)
CREATE INDEX idx_fingerprints_study_ip ON participant_fingerprints(study_id, ip_hash);

-- Index for strict level (browser fingerprint)
CREATE INDEX idx_fingerprints_study_fp ON participant_fingerprints(study_id, fingerprint_hash);

-- Composite index for moderate level combined lookup
CREATE INDEX idx_fingerprints_study_cookie_ip ON participant_fingerprints(study_id, cookie_hash, ip_hash);

-- Enable Row Level Security
ALTER TABLE participant_fingerprints ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow all operations (fingerprints are written by API, not by users directly)
DROP POLICY IF EXISTS "Allow all fingerprint operations" ON participant_fingerprints;
CREATE POLICY "Allow all fingerprint operations"
  ON participant_fingerprints FOR ALL USING (true);

-- Grant permissions
GRANT ALL ON participant_fingerprints TO authenticated;
GRANT ALL ON participant_fingerprints TO anon;

-- Add comment for documentation
COMMENT ON TABLE participant_fingerprints IS 'Stores hashed fingerprints for duplicate response prevention. Fingerprints are stored only on study completion to prevent false positives from abandoned sessions.';
COMMENT ON COLUMN participant_fingerprints.cookie_hash IS 'SHA-256 hash of browser tracking cookie';
COMMENT ON COLUMN participant_fingerprints.ip_hash IS 'SHA-256 hash of participant IP address';
COMMENT ON COLUMN participant_fingerprints.fingerprint_hash IS 'SHA-256 hash of browser fingerprint from FingerprintJS';
COMMENT ON COLUMN participant_fingerprints.fingerprint_confidence IS 'FingerprintJS confidence score (0.00-1.00)';
