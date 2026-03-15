-- Card Sort Results Analysis Migration
-- Adds tables for category standardization, participant flagging, and PCA caching

-- ============================================================================
-- CATEGORY STANDARDIZATIONS TABLE
-- For Open/Hybrid card sorts: stores merged category mappings
-- ============================================================================
CREATE TABLE IF NOT EXISTS category_standardizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id UUID NOT NULL REFERENCES studies(id) ON DELETE CASCADE,

  -- The unified name for merged categories
  standardized_name VARCHAR(255) NOT NULL,

  -- Array of original category names that were merged
  original_names TEXT[] NOT NULL,

  -- Agreement score (0-100): percentage of card overlap between merged categories
  -- Scores above 60% indicate meaningful merges
  agreement_score DECIMAL(5,2),

  -- Clerk user ID who created this standardization
  created_by VARCHAR(255),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PARTICIPANT ANALYSIS FLAGS TABLE
-- Stores auto-detected quality flags for participant responses
-- ============================================================================
CREATE TABLE IF NOT EXISTS participant_analysis_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  study_id UUID NOT NULL REFERENCES studies(id) ON DELETE CASCADE,

  -- Flag types based on Optimal Workshop patterns:
  -- 'all_one_group': All cards placed in a single category
  -- 'each_own_group': Each card in its own unique category
  -- 'no_movement': No cards were sorted (0% activity)
  -- 'too_fast': Completed significantly faster than median
  -- 'too_slow': Completed significantly slower than median
  flag_type TEXT NOT NULL CHECK (flag_type IN (
    'all_one_group',
    'each_own_group',
    'no_movement',
    'too_fast',
    'too_slow'
  )),

  -- Human-readable explanation of why this flag was applied
  flag_reason TEXT,

  -- Whether this participant is excluded from analysis
  is_excluded BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Each participant can only have one flag of each type
  UNIQUE(participant_id, flag_type)
);

-- ============================================================================
-- PCA ANALYSES TABLE (Cache)
-- Caches Participant-Centric Analysis results to avoid recomputation
-- ============================================================================
CREATE TABLE IF NOT EXISTS pca_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id UUID NOT NULL REFERENCES studies(id) ON DELETE CASCADE,

  -- Top 3 Information Architectures found
  -- Shape: [{ id, categories: [{ name, cards: [] }], supportingParticipants: [] }]
  top_ias JSONB NOT NULL DEFAULT '[]',

  -- Support ratio data for each IA
  -- Shape: { iaId: { supporting: number, total: number, ratio: number } }
  support_ratios JSONB NOT NULL DEFAULT '{}',

  -- When this analysis was computed
  computed_at TIMESTAMPTZ DEFAULT NOW(),

  -- Number of responses at time of computation (for cache invalidation)
  response_count INTEGER NOT NULL DEFAULT 0,

  -- Only one PCA analysis per study
  UNIQUE(study_id)
);

-- ============================================================================
-- EXTEND PARTICIPANTS TABLE
-- Add fields for segmentation and analysis
-- ============================================================================
-- URL tags for participant segmentation (e.g., from campaign tracking)
ALTER TABLE participants ADD COLUMN IF NOT EXISTS
  url_tags JSONB DEFAULT '{}';

-- Number of categories created by this participant (for Open/Hybrid sorts)
ALTER TABLE participants ADD COLUMN IF NOT EXISTS
  categories_created INTEGER DEFAULT 0;

-- ============================================================================
-- EXTEND CARD_SORT_RESPONSES TABLE
-- Add fields for analysis
-- ============================================================================
-- Percentage of cards that were moved/sorted (0-100)
ALTER TABLE card_sort_responses ADD COLUMN IF NOT EXISTS
  card_movement_percentage DECIMAL(5,2);

-- Placements after applying category standardization
ALTER TABLE card_sort_responses ADD COLUMN IF NOT EXISTS
  standardized_placements JSONB;

-- ============================================================================
-- INDEXES
-- ============================================================================
-- Category standardizations indexes
CREATE INDEX IF NOT EXISTS idx_cs_study ON category_standardizations(study_id);
CREATE INDEX IF NOT EXISTS idx_cs_study_name ON category_standardizations(study_id, standardized_name);

-- Participant flags indexes
CREATE INDEX IF NOT EXISTS idx_paf_participant ON participant_analysis_flags(participant_id);
CREATE INDEX IF NOT EXISTS idx_paf_study ON participant_analysis_flags(study_id);
CREATE INDEX IF NOT EXISTS idx_paf_study_excluded ON participant_analysis_flags(study_id, is_excluded);
CREATE INDEX IF NOT EXISTS idx_paf_flag_type ON participant_analysis_flags(study_id, flag_type);

-- PCA analyses indexes
CREATE INDEX IF NOT EXISTS idx_pca_study ON pca_analyses(study_id);
CREATE INDEX IF NOT EXISTS idx_pca_computed ON pca_analyses(study_id, computed_at);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE category_standardizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE participant_analysis_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE pca_analyses ENABLE ROW LEVEL SECURITY;

-- Allow all operations (matching existing pattern - can be tightened later)
DROP POLICY IF EXISTS "Allow all category_standardizations operations" ON category_standardizations;
CREATE POLICY "Allow all category_standardizations operations"
  ON category_standardizations FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all participant_analysis_flags operations" ON participant_analysis_flags;
CREATE POLICY "Allow all participant_analysis_flags operations"
  ON participant_analysis_flags FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all pca_analyses operations" ON pca_analyses;
CREATE POLICY "Allow all pca_analyses operations"
  ON pca_analyses FOR ALL USING (true);

-- ============================================================================
-- TRIGGERS
-- ============================================================================
-- Auto-update updated_at for category_standardizations
DROP TRIGGER IF EXISTS category_standardizations_updated_at ON category_standardizations;
CREATE TRIGGER category_standardizations_updated_at
  BEFORE UPDATE ON category_standardizations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- GRANTS
-- ============================================================================
GRANT ALL ON category_standardizations TO authenticated;
GRANT ALL ON category_standardizations TO anon;
GRANT ALL ON participant_analysis_flags TO authenticated;
GRANT ALL ON participant_analysis_flags TO anon;
GRANT ALL ON pca_analyses TO authenticated;
GRANT ALL ON pca_analyses TO anon;
