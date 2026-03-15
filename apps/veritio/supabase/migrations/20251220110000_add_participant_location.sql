-- Participant Location Migration
-- Adds geographic location fields to participants table for results analytics

-- ============================================================================
-- EXTEND PARTICIPANTS TABLE
-- Add location fields captured from IP geolocation
-- ============================================================================

-- Country name (e.g., "United States", "India", "Germany")
ALTER TABLE participants ADD COLUMN IF NOT EXISTS
  country TEXT;

-- Region/state/province (e.g., "California", "Maharashtra", "Bavaria")
ALTER TABLE participants ADD COLUMN IF NOT EXISTS
  region TEXT;

-- City name (e.g., "San Francisco", "Mumbai", "Munich")
ALTER TABLE participants ADD COLUMN IF NOT EXISTS
  city TEXT;

-- ============================================================================
-- INDEXES
-- ============================================================================
-- Index for location-based filtering and aggregation
CREATE INDEX IF NOT EXISTS idx_participants_country ON participants(country);
CREATE INDEX IF NOT EXISTS idx_participants_study_country ON participants(study_id, country);

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON COLUMN participants.country IS 'Country name from IP geolocation (e.g., "United States")';
COMMENT ON COLUMN participants.region IS 'Region/state name from IP geolocation (e.g., "California")';
COMMENT ON COLUMN participants.city IS 'City name from IP geolocation (e.g., "San Francisco")';
