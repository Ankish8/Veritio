-- Migration: Add widget impressions tracking for frequency capping
-- This enables backend tracking of widget impressions per visitor with privacy-preserving hashing

-- ============================================================================
-- TABLE: widget_impressions
-- Purpose: Track widget impression frequency per visitor for capping rules
-- Privacy: Uses SHA-256 hashes instead of raw IPs
-- ============================================================================

CREATE TABLE IF NOT EXISTS widget_impressions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id UUID NOT NULL REFERENCES studies(id) ON DELETE CASCADE,

  -- Visitor identification (privacy-preserving)
  visitor_hash TEXT NOT NULL,      -- SHA-256 hash of IP + fingerprint
  ip_hash TEXT NOT NULL,           -- SHA-256 hash of IP address only
  fingerprint_hash TEXT,           -- Optional browser fingerprint hash

  -- Impression tracking
  impression_count INTEGER DEFAULT 1 CHECK (impression_count >= 0),
  first_seen_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  last_seen_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Participation status
  has_participated BOOLEAN DEFAULT false NOT NULL,
  participated_at TIMESTAMPTZ,

  -- Metadata
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Constraints
  CONSTRAINT unique_visitor_per_study UNIQUE(study_id, visitor_hash),
  CONSTRAINT participated_at_requires_flag CHECK (
    (has_participated = true AND participated_at IS NOT NULL) OR
    (has_participated = false AND participated_at IS NULL)
  )
);

-- ============================================================================
-- INDEXES for performance
-- ============================================================================

-- Primary lookup: find visitor's impression record for a study
CREATE INDEX idx_widget_impressions_study_visitor
  ON widget_impressions(study_id, visitor_hash);

-- Analytics: get all impressions for a study
CREATE INDEX idx_widget_impressions_study_id
  ON widget_impressions(study_id);

-- Cleanup: find old impressions to archive/delete
CREATE INDEX idx_widget_impressions_last_seen
  ON widget_impressions(last_seen_at);

-- Visitor lookup across studies (for cross-study analytics)
CREATE INDEX idx_widget_impressions_visitor_hash
  ON widget_impressions(visitor_hash);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE widget_impressions ENABLE ROW LEVEL SECURITY;

-- Policy: Study owners can read their widget impressions for analytics
CREATE POLICY "Users can read widget impressions for their studies"
  ON widget_impressions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM studies
      WHERE studies.id = widget_impressions.study_id
      AND studies.user_id = auth.uid()::TEXT
    )
  );

-- Policy: Public endpoint can insert new impressions (widget tracking)
CREATE POLICY "Anyone can insert widget impressions"
  ON widget_impressions
  FOR INSERT
  WITH CHECK (true);

-- Policy: Public endpoint can update impressions (increment count, mark participation)
CREATE POLICY "Anyone can update widget impressions"
  ON widget_impressions
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Policy: Study owners can delete their widget impressions
CREATE POLICY "Users can delete widget impressions for their studies"
  ON widget_impressions
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM studies
      WHERE studies.id = widget_impressions.study_id
      AND studies.user_id = auth.uid()::TEXT
    )
  );

-- ============================================================================
-- FUNCTION: Update updated_at timestamp automatically
-- ============================================================================

CREATE OR REPLACE FUNCTION update_widget_impressions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER widget_impressions_updated_at
  BEFORE UPDATE ON widget_impressions
  FOR EACH ROW
  EXECUTE FUNCTION update_widget_impressions_updated_at();

-- ============================================================================
-- COMMENTS for documentation
-- ============================================================================

COMMENT ON TABLE widget_impressions IS
  'Tracks widget impression frequency per visitor for frequency capping and targeting. Uses privacy-preserving hashes instead of raw IPs.';

COMMENT ON COLUMN widget_impressions.visitor_hash IS
  'SHA-256 hash of IP + browser fingerprint. Primary visitor identifier.';

COMMENT ON COLUMN widget_impressions.ip_hash IS
  'SHA-256 hash of IP address only. Fallback if fingerprint unavailable.';

COMMENT ON COLUMN widget_impressions.fingerprint_hash IS
  'SHA-256 hash of browser fingerprint (UA, screen, timezone, etc.). Optional but improves accuracy.';

COMMENT ON COLUMN widget_impressions.impression_count IS
  'Number of times widget has been shown to this visitor for this study.';

COMMENT ON COLUMN widget_impressions.has_participated IS
  'Whether visitor clicked widget CTA and completed the study.';

COMMENT ON COLUMN widget_impressions.participated_at IS
  'Timestamp when visitor clicked widget CTA. Used to exclude from future impressions.';
