-- Add composio_triggers table for managing event triggers on connected toolkits
CREATE TABLE composio_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  toolkit TEXT NOT NULL,
  trigger_slug TEXT NOT NULL,
  composio_trigger_id TEXT,
  trigger_config JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active',
  last_event_at TIMESTAMPTZ,
  event_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, toolkit, trigger_slug)
);

CREATE INDEX idx_composio_triggers_user ON composio_triggers(user_id);
