-- Add onboarding profile columns to user_preferences
ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS onboarding_role TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS onboarding_company TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS onboarding_team_size TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN user_preferences.onboarding_role IS 'User role selected during onboarding: ux_researcher, product_manager, designer, student_academic, other';
COMMENT ON COLUMN user_preferences.onboarding_company IS 'Company name provided during onboarding';
COMMENT ON COLUMN user_preferences.onboarding_team_size IS 'Team size selected during onboarding: solo, 2-5, 6-20, 20+';
COMMENT ON COLUMN user_preferences.onboarding_completed IS 'Whether the user has completed (or skipped) onboarding';
