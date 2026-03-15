-- Add assistant_pending_events table for queuing trigger events for the AI assistant
CREATE TABLE assistant_pending_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  trigger_id UUID NOT NULL REFERENCES composio_triggers(id) ON DELETE CASCADE,
  toolkit TEXT NOT NULL,
  trigger_slug TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_summary TEXT NOT NULL,
  event_payload JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending',
  surfaced_in_conversation_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  surfaced_at TIMESTAMPTZ
);

CREATE INDEX idx_pending_events_user_status ON assistant_pending_events(user_id, status);
