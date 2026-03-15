-- ================================================================
-- Migration: Add A/B Test Variants Tables
-- Description: Stores A/B test configurations and participant assignments
-- Supports: Question and section variants, deterministic assignment
-- ================================================================

-- ================================================================
-- 1. Create ab_test_variants table
-- ================================================================
CREATE TABLE IF NOT EXISTS ab_test_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id UUID NOT NULL REFERENCES studies(id) ON DELETE CASCADE,

  -- Entity being tested (question or section)
  entity_type TEXT NOT NULL CHECK (entity_type IN ('question', 'section')),
  entity_id UUID NOT NULL,

  -- Variant content (JSON containing the variant-specific configuration)
  variant_a_content JSONB NOT NULL DEFAULT '{}',
  variant_b_content JSONB NOT NULL DEFAULT '{}',

  -- Split configuration
  split_percentage INTEGER NOT NULL DEFAULT 50 CHECK (split_percentage >= 0 AND split_percentage <= 100),
  is_enabled BOOLEAN NOT NULL DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure one A/B test per entity
  UNIQUE(study_id, entity_id)
);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_ab_test_variants_study_id ON ab_test_variants(study_id);
CREATE INDEX IF NOT EXISTS idx_ab_test_variants_entity_id ON ab_test_variants(entity_id);

-- ================================================================
-- 2. Create participant_variant_assignments table
-- ================================================================
CREATE TABLE IF NOT EXISTS participant_variant_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  ab_test_variant_id UUID NOT NULL REFERENCES ab_test_variants(id) ON DELETE CASCADE,

  -- Assigned variant
  assigned_variant TEXT NOT NULL CHECK (assigned_variant IN ('A', 'B')),

  -- Timestamps
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure one assignment per participant per test
  UNIQUE(participant_id, ab_test_variant_id)
);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_pva_participant_id ON participant_variant_assignments(participant_id);
CREATE INDEX IF NOT EXISTS idx_pva_ab_test_variant_id ON participant_variant_assignments(ab_test_variant_id);

-- ================================================================
-- 3. Enable RLS (Row Level Security)
-- ================================================================
ALTER TABLE ab_test_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE participant_variant_assignments ENABLE ROW LEVEL SECURITY;

-- ================================================================
-- 4. RLS Policies for ab_test_variants
-- (Using simple policies since Clerk handles auth and service role bypasses RLS)
-- ================================================================

-- Policy: Allow all operations (auth handled at API level via Clerk)
CREATE POLICY "Users can view A/B tests" ON ab_test_variants
  FOR SELECT USING (true);

CREATE POLICY "Users can insert A/B tests" ON ab_test_variants
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update A/B tests" ON ab_test_variants
  FOR UPDATE USING (true);

CREATE POLICY "Users can delete A/B tests" ON ab_test_variants
  FOR DELETE USING (true);

-- ================================================================
-- 5. RLS Policies for participant_variant_assignments
-- ================================================================

CREATE POLICY "Users can view variant assignments" ON participant_variant_assignments
  FOR SELECT USING (true);

CREATE POLICY "Users can insert variant assignments" ON participant_variant_assignments
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update variant assignments" ON participant_variant_assignments
  FOR UPDATE USING (true);

CREATE POLICY "Users can delete variant assignments" ON participant_variant_assignments
  FOR DELETE USING (true);

-- ================================================================
-- 6. Comments for documentation
-- ================================================================
COMMENT ON TABLE ab_test_variants IS 'Stores A/B test configurations for questions and sections';
COMMENT ON COLUMN ab_test_variants.entity_type IS 'Type of entity being tested: question or section';
COMMENT ON COLUMN ab_test_variants.entity_id IS 'UUID of the question or section being tested';
COMMENT ON COLUMN ab_test_variants.variant_a_content IS 'JSON content for variant A';
COMMENT ON COLUMN ab_test_variants.variant_b_content IS 'JSON content for variant B';
COMMENT ON COLUMN ab_test_variants.split_percentage IS 'Percentage of participants receiving variant A (0-100)';

COMMENT ON TABLE participant_variant_assignments IS 'Records which variant each participant received for each A/B test';
COMMENT ON COLUMN participant_variant_assignments.assigned_variant IS 'The variant assigned: A or B';
