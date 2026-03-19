-- Per-user AI model configuration
-- Allows users to override the default (env-var) AI provider settings
-- with their own API keys, base URLs, and model selections.

ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS ai_openai_api_key    TEXT    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ai_openai_base_url   TEXT    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ai_openai_model      TEXT    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ai_mercury_api_key   TEXT    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ai_mercury_base_url  TEXT    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ai_mercury_model     TEXT    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ai_use_same_provider BOOLEAN DEFAULT NULL;
