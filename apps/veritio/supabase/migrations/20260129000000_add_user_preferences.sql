-- Migration: Add user_preferences table for storing user settings and study defaults
-- This table stores all user-specific preferences in a normalized structure

CREATE TABLE IF NOT EXISTS user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL UNIQUE,

  -- Profile preferences
  avatar_url text,
  display_name_preference text DEFAULT 'full_name', -- 'full_name' | 'first_name' | 'email'

  -- Study defaults - Branding
  default_primary_color text DEFAULT '#18181b',
  default_background_color text DEFAULT '#ffffff',
  default_style_preset text DEFAULT 'default', -- 'default' | 'vega' | 'nova' | 'maia' | 'lyra' | 'mira'
  default_radius_option text DEFAULT 'default', -- 'none' | 'small' | 'default' | 'large'
  default_theme_mode text DEFAULT 'light', -- 'light' | 'dark' | 'system'
  default_logo_url text,
  default_logo_size integer DEFAULT 48,

  -- Study defaults - Settings
  default_language text DEFAULT 'en-US',
  default_closing_rule_type text DEFAULT 'none', -- 'none' | 'date' | 'participant_count' | 'both'
  default_max_participants integer,
  default_response_prevention_level text DEFAULT 'none', -- 'none' | 'relaxed' | 'moderate' | 'strict'

  -- Study defaults - Notifications
  default_notifications_enabled boolean DEFAULT false,
  default_notify_every_response boolean DEFAULT false,
  default_notify_milestones boolean DEFAULT true,
  default_milestone_values integer[] DEFAULT '{10,50,100,500,1000}',
  default_notify_daily_digest boolean DEFAULT false,
  default_notify_on_close boolean DEFAULT true,

  -- Dashboard appearance
  dashboard_theme text DEFAULT 'system', -- 'light' | 'dark' | 'system'
  dashboard_table_density text DEFAULT 'default', -- 'compact' | 'default' | 'comfortable'
  dashboard_show_archived boolean DEFAULT false,

  -- Account email notifications
  email_marketing boolean DEFAULT true,
  email_product_updates boolean DEFAULT true,
  email_security_alerts boolean DEFAULT true,

  -- Data & Privacy
  analytics_enabled boolean DEFAULT true,

  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index for efficient user lookup
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

-- Create trigger function for auto-updating updated_at
CREATE OR REPLACE FUNCTION update_user_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at on row update
DROP TRIGGER IF EXISTS trigger_user_preferences_updated_at ON user_preferences;
CREATE TRIGGER trigger_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_user_preferences_updated_at();

-- Enable Row Level Security
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Service role can do everything (for API access)
CREATE POLICY "Service role has full access to user_preferences"
  ON user_preferences
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add comment for documentation
COMMENT ON TABLE user_preferences IS 'Stores user preferences including profile settings, study defaults, dashboard appearance, and notification preferences';
