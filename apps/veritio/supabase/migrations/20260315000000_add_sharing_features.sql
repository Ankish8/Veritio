-- Migration: Add Sharing Features
-- Description: Adds sharing_settings JSONB column, link_analytics table, and public_results_token
-- Date: 2026-01-07

-- =============================================================================
-- 1. Add sharing_settings JSONB column to studies table
-- =============================================================================
-- Structure:
-- {
--   "redirects": {
--     "completionUrl": "https://...",
--     "screenoutUrl": "https://...",
--     "quotaFullUrl": "https://...",
--     "redirectDelay": 5
--   },
--   "intercept": {
--     "enabled": true,
--     "position": "bottom-right",
--     "triggerType": "time_delay",
--     "triggerValue": 5,
--     "backgroundColor": "#ffffff",
--     "textColor": "#000000",
--     "buttonColor": "#000000",
--     "title": "Help us improve",
--     "description": "...",
--     "buttonText": "Take Survey",
--     "screeningQuestion": { "question": "...", "options": [...], "correctOption": 0 }
--   },
--   "publicResults": {
--     "enabled": true,
--     "password": "optional",
--     "expiresAt": "2025-12-31T23:59:59Z",
--     "sharedMetrics": { "overview": true, "participants": true, "analysis": true, "questionnaire": true }
--   }
-- }

ALTER TABLE studies ADD COLUMN IF NOT EXISTS sharing_settings JSONB DEFAULT '{}';

COMMENT ON COLUMN studies.sharing_settings IS 'JSONB column storing all sharing-related settings: redirects, intercept widget config, public results settings';

-- =============================================================================
-- 2. Add public_results_token column for public results sharing
-- =============================================================================

ALTER TABLE studies ADD COLUMN IF NOT EXISTS public_results_token TEXT;

-- Create unique index for token lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_studies_public_results_token
  ON studies(public_results_token)
  WHERE public_results_token IS NOT NULL;

COMMENT ON COLUMN studies.public_results_token IS 'Unique token for public results sharing URL';

-- =============================================================================
-- 3. Create link_analytics table for tracking link clicks and conversions
-- =============================================================================

CREATE TABLE IF NOT EXISTS link_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id UUID NOT NULL REFERENCES studies(id) ON DELETE CASCADE,

  -- Source tracking
  source TEXT NOT NULL,  -- 'qr_code', 'email', 'widget', 'direct', 'custom'

  -- UTM parameters
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_term TEXT,
  utm_content TEXT,

  -- Custom URL parameters (any other params passed)
  custom_params JSONB,

  -- Event type
  event_type TEXT NOT NULL,  -- 'view', 'start', 'complete', 'screenout', 'quota_full'

  -- Optional link to participant
  participant_id UUID REFERENCES participants(id) ON DELETE SET NULL,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Anonymized tracking (for unique counts without storing IPs)
  ip_hash TEXT,
  user_agent TEXT,

  -- Constraints
  CONSTRAINT valid_source CHECK (source IN ('qr_code', 'email', 'widget', 'direct', 'custom')),
  CONSTRAINT valid_event_type CHECK (event_type IN ('view', 'start', 'complete', 'screenout', 'quota_full'))
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_link_analytics_study_id ON link_analytics(study_id);
CREATE INDEX IF NOT EXISTS idx_link_analytics_source ON link_analytics(source);
CREATE INDEX IF NOT EXISTS idx_link_analytics_event_type ON link_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_link_analytics_created_at ON link_analytics(created_at);
CREATE INDEX IF NOT EXISTS idx_link_analytics_study_source ON link_analytics(study_id, source);
CREATE INDEX IF NOT EXISTS idx_link_analytics_study_event ON link_analytics(study_id, event_type);

COMMENT ON TABLE link_analytics IS 'Tracks link clicks and conversions from different distribution sources';

-- =============================================================================
-- 4. Enable RLS on link_analytics
-- =============================================================================

ALTER TABLE link_analytics ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read analytics for studies they own
CREATE POLICY "Users can read analytics for their own studies"
  ON link_analytics
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM studies
      WHERE studies.id = link_analytics.study_id
      AND studies.user_id = auth.uid()::TEXT
    )
  );

-- Policy: Anyone can insert analytics (public endpoint for tracking)
CREATE POLICY "Anyone can insert link analytics"
  ON link_analytics
  FOR INSERT
  WITH CHECK (true);

-- Policy: Only study owners can delete analytics
CREATE POLICY "Users can delete analytics for their own studies"
  ON link_analytics
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM studies
      WHERE studies.id = link_analytics.study_id
      AND studies.user_id = auth.uid()::TEXT
    )
  );

-- =============================================================================
-- 5. Add helper function for analytics aggregation
-- =============================================================================

CREATE OR REPLACE FUNCTION get_link_analytics_summary(p_study_id UUID)
RETURNS TABLE (
  source TEXT,
  views BIGINT,
  starts BIGINT,
  completes BIGINT,
  screenouts BIGINT,
  quota_fulls BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    la.source,
    COUNT(*) FILTER (WHERE la.event_type = 'view') as views,
    COUNT(*) FILTER (WHERE la.event_type = 'start') as starts,
    COUNT(*) FILTER (WHERE la.event_type = 'complete') as completes,
    COUNT(*) FILTER (WHERE la.event_type = 'screenout') as screenouts,
    COUNT(*) FILTER (WHERE la.event_type = 'quota_full') as quota_fulls
  FROM link_analytics la
  WHERE la.study_id = p_study_id
  GROUP BY la.source
  ORDER BY views DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_link_analytics_summary(UUID) TO authenticated;
