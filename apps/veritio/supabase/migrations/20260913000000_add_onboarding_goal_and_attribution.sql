-- Persist the onboarding study intent and bounded first-touch campaign data.
-- Values are validated by the application before this service-role table is written.
ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS onboarding_goal TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS attribution_source TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS attribution_medium TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS attribution_campaign TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS attribution_content TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS attribution_term TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS attribution_captured_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE user_preferences
  DROP CONSTRAINT IF EXISTS user_preferences_onboarding_goal_check,
  ADD CONSTRAINT user_preferences_onboarding_goal_check
    CHECK (
      onboarding_goal IS NULL OR onboarding_goal IN (
        'card_sort', 'tree_test', 'survey', 'prototype_test', 'exploring'
      )
    ),
  DROP CONSTRAINT IF EXISTS user_preferences_attribution_source_length,
  ADD CONSTRAINT user_preferences_attribution_source_length
    CHECK (attribution_source IS NULL OR char_length(attribution_source) <= 120),
  DROP CONSTRAINT IF EXISTS user_preferences_attribution_medium_length,
  ADD CONSTRAINT user_preferences_attribution_medium_length
    CHECK (attribution_medium IS NULL OR char_length(attribution_medium) <= 120),
  DROP CONSTRAINT IF EXISTS user_preferences_attribution_campaign_length,
  ADD CONSTRAINT user_preferences_attribution_campaign_length
    CHECK (attribution_campaign IS NULL OR char_length(attribution_campaign) <= 120),
  DROP CONSTRAINT IF EXISTS user_preferences_attribution_content_length,
  ADD CONSTRAINT user_preferences_attribution_content_length
    CHECK (attribution_content IS NULL OR char_length(attribution_content) <= 120),
  DROP CONSTRAINT IF EXISTS user_preferences_attribution_term_length,
  ADD CONSTRAINT user_preferences_attribution_term_length
    CHECK (attribution_term IS NULL OR char_length(attribution_term) <= 120);

COMMENT ON COLUMN user_preferences.onboarding_goal IS
  'Study type selected during onboarding; used to open the matching creation template.';
COMMENT ON COLUMN user_preferences.attribution_captured_at IS
  'Timestamp at which the first-touch UTM campaign cookie was recorded.';
