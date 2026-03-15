-- Migration: Add last_active_org_id to user_preferences for cross-device workspace persistence

ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS last_active_org_id text;

COMMENT ON COLUMN user_preferences.last_active_org_id IS 'Last active organization/workspace the user was on. Used to restore workspace context after login on any device.';
