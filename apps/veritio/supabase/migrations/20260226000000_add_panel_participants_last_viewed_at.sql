-- Add panel_participants_last_viewed_at to user_preferences
-- Used for "mark as read" badge behavior on Panel > Participants sidebar item
ALTER TABLE user_preferences
ADD COLUMN IF NOT EXISTS panel_participants_last_viewed_at TIMESTAMPTZ DEFAULT NULL;
