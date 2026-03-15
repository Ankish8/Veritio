-- Panel Feature Migration
-- Adds tables for participant CRM, tags, incentives, segments, and widget configuration
-- Part of the Veritio Panel feature for managing research participants across studies

-- ============================================================================
-- PANEL PARTICIPANTS (Core CRM)
-- ============================================================================

-- Organization-wide participant records (identified by email)
CREATE TABLE IF NOT EXISTS panel_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,

  -- Identity (email is required for panel participants)
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,

  -- Status: active, inactive, blacklisted
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blacklisted')),

  -- Source tracking: widget, import, manual, link
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('widget', 'import', 'manual', 'link', 'email')),
  source_details JSONB DEFAULT '{}'::jsonb,

  -- Flexible demographics (country, age_range, gender, industry, job_role, company_size, language)
  demographics JSONB DEFAULT '{}'::jsonb,

  -- User-defined custom attributes (hybrid approach: pre-defined + freeform)
  custom_attributes JSONB DEFAULT '{}'::jsonb,

  -- Consent tracking
  consent_given_at TIMESTAMPTZ,
  consent_version TEXT,

  -- Contact tracking
  last_contacted_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ,

  -- Unique email per user (organization proxy)
  CONSTRAINT unique_email_per_user UNIQUE (user_id, email)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_panel_participants_user_id ON panel_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_panel_participants_email ON panel_participants(email);
CREATE INDEX IF NOT EXISTS idx_panel_participants_status ON panel_participants(status);
CREATE INDEX IF NOT EXISTS idx_panel_participants_source ON panel_participants(source);
CREATE INDEX IF NOT EXISTS idx_panel_participants_last_active ON panel_participants(last_active_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_panel_participants_created_at ON panel_participants(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_panel_participants_demographics ON panel_participants USING GIN (demographics);
CREATE INDEX IF NOT EXISTS idx_panel_participants_custom_attrs ON panel_participants USING GIN (custom_attributes);

-- ============================================================================
-- PANEL TAGS (Organization-wide)
-- ============================================================================

-- Tags for organizing participants
CREATE TABLE IF NOT EXISTS panel_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,

  name TEXT NOT NULL,
  color TEXT DEFAULT '#6b7280', -- hex color
  description TEXT,

  -- System tags are auto-created and cannot be deleted
  is_system BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique tag name per user
  CONSTRAINT unique_tag_name_per_user UNIQUE (user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_panel_tags_user_id ON panel_tags(user_id);
CREATE INDEX IF NOT EXISTS idx_panel_tags_is_system ON panel_tags(is_system);

-- ============================================================================
-- PANEL PARTICIPANT TAGS (Junction with source tracking)
-- ============================================================================

-- Tag assignments with source tracking
CREATE TABLE IF NOT EXISTS panel_participant_tags (
  panel_participant_id UUID NOT NULL REFERENCES panel_participants(id) ON DELETE CASCADE,
  panel_tag_id UUID NOT NULL REFERENCES panel_tags(id) ON DELETE CASCADE,

  -- Source: how the tag was assigned (widget, import, manual, link, auto)
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('widget', 'import', 'manual', 'link', 'auto')),

  assigned_at TIMESTAMPTZ DEFAULT NOW(),

  PRIMARY KEY (panel_participant_id, panel_tag_id)
);

CREATE INDEX IF NOT EXISTS idx_panel_participant_tags_participant ON panel_participant_tags(panel_participant_id);
CREATE INDEX IF NOT EXISTS idx_panel_participant_tags_tag ON panel_participant_tags(panel_tag_id);

-- ============================================================================
-- PANEL STUDY PARTICIPATIONS (Full Funnel Tracking)
-- ============================================================================

-- Links panel participants to studies with full funnel tracking
CREATE TABLE IF NOT EXISTS panel_study_participations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  panel_participant_id UUID NOT NULL REFERENCES panel_participants(id) ON DELETE CASCADE,
  study_id UUID NOT NULL REFERENCES studies(id) ON DELETE CASCADE,

  -- Link to actual study response (when participant completes)
  participant_id UUID REFERENCES participants(id) ON DELETE SET NULL,

  -- Full funnel status: invited, started, completed, abandoned, screened_out
  status TEXT NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'started', 'completed', 'abandoned', 'screened_out')),

  -- Source: how they were recruited
  source TEXT CHECK (source IN ('widget', 'link', 'email', 'direct')),

  -- Timestamps for funnel tracking
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Duration in seconds (if completed)
  completion_time_seconds INTEGER,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- One participation per study per panel participant
  CONSTRAINT unique_participation_per_study UNIQUE (panel_participant_id, study_id)
);

CREATE INDEX IF NOT EXISTS idx_panel_study_participations_participant ON panel_study_participations(panel_participant_id);
CREATE INDEX IF NOT EXISTS idx_panel_study_participations_study ON panel_study_participations(study_id);
CREATE INDEX IF NOT EXISTS idx_panel_study_participations_status ON panel_study_participations(status);
CREATE INDEX IF NOT EXISTS idx_panel_study_participations_existing_participant ON panel_study_participations(participant_id);

-- ============================================================================
-- STUDY INCENTIVE CONFIGS (Per-study incentive settings)
-- ============================================================================

-- Incentive configuration per study
CREATE TABLE IF NOT EXISTS study_incentive_configs (
  study_id UUID PRIMARY KEY REFERENCES studies(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,

  enabled BOOLEAN DEFAULT FALSE,

  -- Incentive details
  amount DECIMAL(10,2),
  currency TEXT DEFAULT 'USD', -- ISO 4217 currency code
  incentive_type TEXT DEFAULT 'gift_card' CHECK (incentive_type IN ('gift_card', 'cash', 'credit', 'donation', 'other')),
  description TEXT, -- e.g., "Amazon Gift Card"

  -- Future integration support
  fulfillment_provider TEXT, -- e.g., 'tremendous', 'tango_card'
  fulfillment_config JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_study_incentive_configs_user_id ON study_incentive_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_study_incentive_configs_enabled ON study_incentive_configs(enabled);

-- ============================================================================
-- PANEL INCENTIVE DISTRIBUTIONS (Payout records)
-- ============================================================================

-- Record of incentive distributions (actual payouts)
CREATE TABLE IF NOT EXISTS panel_incentive_distributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Who received it
  panel_participant_id UUID NOT NULL REFERENCES panel_participants(id) ON DELETE CASCADE,

  -- For which study
  study_id UUID NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
  participation_id UUID REFERENCES panel_study_participations(id) ON DELETE SET NULL,

  -- Amount details (multi-currency)
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',

  -- Status: promised, pending, sent, redeemed, failed, cancelled
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('promised', 'pending', 'sent', 'redeemed', 'failed', 'cancelled')),

  -- Fulfillment tracking
  fulfillment_method TEXT, -- e.g., 'amazon', 'paypal', 'bank_transfer'
  fulfillment_reference TEXT, -- Order/transaction ID

  -- Notes
  notes TEXT,

  -- Timestamps
  promised_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  redeemed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_panel_incentive_distributions_participant ON panel_incentive_distributions(panel_participant_id);
CREATE INDEX IF NOT EXISTS idx_panel_incentive_distributions_study ON panel_incentive_distributions(study_id);
CREATE INDEX IF NOT EXISTS idx_panel_incentive_distributions_status ON panel_incentive_distributions(status);
CREATE INDEX IF NOT EXISTS idx_panel_incentive_distributions_created ON panel_incentive_distributions(created_at DESC);

-- ============================================================================
-- PANEL WIDGET CONFIGS (Global widget configuration)
-- ============================================================================

-- Widget configuration per user (global widget with study selector)
CREATE TABLE IF NOT EXISTS panel_widget_configs (
  user_id TEXT PRIMARY KEY,

  -- Which study the widget currently promotes
  active_study_id UUID REFERENCES studies(id) ON DELETE SET NULL,

  -- Widget configuration (stored as JSONB for flexibility)
  -- Includes: appearance, content, triggers, targeting, frequency, capture_settings
  config JSONB DEFAULT '{
    "enabled": false,
    "position": "bottom-right",
    "triggerType": "time_delay",
    "triggerValue": 5,
    "backgroundColor": "#ffffff",
    "textColor": "#1a1a1a",
    "buttonColor": "#000000",
    "title": "Help us improve!",
    "description": "Share your feedback to help us improve.",
    "buttonText": "Get Started",
    "captureSettings": {
      "collectEmail": true,
      "collectDemographics": true,
      "demographicFields": ["country", "age_range"]
    },
    "frequencyCapping": {
      "enabled": true,
      "maxImpressions": 3,
      "timeWindow": "day"
    }
  }'::jsonb,

  -- Default tags to apply to widget captures
  default_tag_ids UUID[] DEFAULT ARRAY[]::UUID[],

  -- Generated embed code identifier
  embed_code_id TEXT UNIQUE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PANEL SEGMENTS (Dynamic filter definitions)
-- ============================================================================

-- Saved segment definitions for filtering participants
CREATE TABLE IF NOT EXISTS panel_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,

  name TEXT NOT NULL,
  description TEXT,

  -- Filter conditions (AND logic only)
  -- Example: [{"field": "demographics.country", "operator": "equals", "value": "US"}, {"field": "tags", "operator": "contains", "value": "uuid-of-tag"}]
  conditions JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Cached participant count (updated periodically)
  participant_count INTEGER DEFAULT 0,
  last_count_updated_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique segment name per user
  CONSTRAINT unique_segment_name_per_user UNIQUE (user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_panel_segments_user_id ON panel_segments(user_id);
CREATE INDEX IF NOT EXISTS idx_panel_segments_conditions ON panel_segments USING GIN (conditions);

-- ============================================================================
-- PANEL PARTICIPANT NOTES (Timestamped entries)
-- ============================================================================

-- Notes attached to participants
CREATE TABLE IF NOT EXISTS panel_participant_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  panel_participant_id UUID NOT NULL REFERENCES panel_participants(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,

  content TEXT NOT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_panel_participant_notes_participant ON panel_participant_notes(panel_participant_id);
CREATE INDEX IF NOT EXISTS idx_panel_participant_notes_created ON panel_participant_notes(created_at DESC);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE panel_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE panel_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE panel_participant_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE panel_study_participations ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_incentive_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE panel_incentive_distributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE panel_widget_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE panel_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE panel_participant_notes ENABLE ROW LEVEL SECURITY;

-- Service role has full access (for Motia API with service key)
CREATE POLICY "Service role full access panel_participants" ON panel_participants
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access panel_tags" ON panel_tags
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access panel_participant_tags" ON panel_participant_tags
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access panel_study_participations" ON panel_study_participations
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access study_incentive_configs" ON study_incentive_configs
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access panel_incentive_distributions" ON panel_incentive_distributions
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access panel_widget_configs" ON panel_widget_configs
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access panel_segments" ON panel_segments
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access panel_participant_notes" ON panel_participant_notes
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_panel_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER panel_participants_updated_at
  BEFORE UPDATE ON panel_participants
  FOR EACH ROW EXECUTE FUNCTION update_panel_updated_at();

CREATE TRIGGER panel_study_participations_updated_at
  BEFORE UPDATE ON panel_study_participations
  FOR EACH ROW EXECUTE FUNCTION update_panel_updated_at();

CREATE TRIGGER study_incentive_configs_updated_at
  BEFORE UPDATE ON study_incentive_configs
  FOR EACH ROW EXECUTE FUNCTION update_panel_updated_at();

CREATE TRIGGER panel_incentive_distributions_updated_at
  BEFORE UPDATE ON panel_incentive_distributions
  FOR EACH ROW EXECUTE FUNCTION update_panel_updated_at();

CREATE TRIGGER panel_widget_configs_updated_at
  BEFORE UPDATE ON panel_widget_configs
  FOR EACH ROW EXECUTE FUNCTION update_panel_updated_at();

CREATE TRIGGER panel_segments_updated_at
  BEFORE UPDATE ON panel_segments
  FOR EACH ROW EXECUTE FUNCTION update_panel_updated_at();

CREATE TRIGGER panel_participant_notes_updated_at
  BEFORE UPDATE ON panel_participant_notes
  FOR EACH ROW EXECUTE FUNCTION update_panel_updated_at();

-- ============================================================================
-- SEED DEFAULT TAGS
-- ============================================================================

-- Function to create default source-based tags for a user
CREATE OR REPLACE FUNCTION create_default_panel_tags(p_user_id TEXT)
RETURNS VOID AS $$
BEGIN
  INSERT INTO panel_tags (user_id, name, color, description, is_system)
  VALUES
    (p_user_id, 'Widget', '#22c55e', 'Captured via website widget', TRUE),
    (p_user_id, 'Import', '#3b82f6', 'Imported from CSV file', TRUE),
    (p_user_id, 'Manual', '#8b5cf6', 'Manually added', TRUE),
    (p_user_id, 'Link', '#f59e0b', 'Joined via direct link', TRUE)
  ON CONFLICT (user_id, name) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE panel_participants IS 'Organization-wide participant CRM for managing research participants across studies';
COMMENT ON TABLE panel_tags IS 'Tags for organizing and filtering panel participants';
COMMENT ON TABLE panel_participant_tags IS 'Junction table linking participants to tags with source tracking';
COMMENT ON TABLE panel_study_participations IS 'Tracks participant journey through studies (full funnel: invited → started → completed)';
COMMENT ON TABLE study_incentive_configs IS 'Per-study incentive configuration';
COMMENT ON TABLE panel_incentive_distributions IS 'Record of incentive payouts to participants';
COMMENT ON TABLE panel_widget_configs IS 'Global widget configuration for participant recruitment';
COMMENT ON TABLE panel_segments IS 'Saved filter definitions for segmenting participants';
COMMENT ON TABLE panel_participant_notes IS 'Timestamped notes attached to participants';

COMMENT ON COLUMN panel_participants.demographics IS 'JSONB field for flexible demographics: country, age_range, gender, industry, job_role, company_size, language';
COMMENT ON COLUMN panel_participants.custom_attributes IS 'User-defined attributes (hybrid: pre-defined + freeform)';
COMMENT ON COLUMN panel_participants.status IS 'Participant status: active, inactive, blacklisted (blacklisted prevents study participation)';
COMMENT ON COLUMN panel_study_participations.status IS 'Funnel status: invited, started, completed, abandoned, screened_out';
COMMENT ON COLUMN panel_incentive_distributions.currency IS 'ISO 4217 currency code (USD, EUR, GBP, etc.)';
COMMENT ON COLUMN panel_segments.conditions IS 'AND conditions array: [{field, operator, value}]';
