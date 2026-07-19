-- Scheduled events: durable delayed-event store for scheduler-service.
--
-- Replaces the BullMQ delayed-jobs mechanism ('motia-scheduled-events' queue),
-- whose consumer worker (src/lib/scheduler/worker.ts, deleted with this
-- change) was never initialized anywhere — delayed jobs pushed by
-- scheduleEvent() rotted in Redis unconsumed, so date-based study auto-close
-- and transcription retry scheduling were silently broken. The replacement:
--   - scheduler-service writes rows here (same exported API as before)
--   - src/steps/cron/process-scheduled-events.step.ts polls every 30s,
--     atomically claims due rows, and enqueues {topic, data} onto the iii
--     durable queue
--
-- Backend-internal table: only the service-role client touches it. RLS is
-- enabled with no policies so anon/authenticated roles have no access.

CREATE TABLE IF NOT EXISTS scheduled_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id        text NOT NULL UNIQUE,
  topic         text NOT NULL,
  data          jsonb NOT NULL DEFAULT '{}'::jsonb,
  scheduled_for timestamptz NOT NULL,
  -- pending → processing → done | failed; cancelled via cancelScheduledEvent()
  status        text NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'processing', 'done', 'failed', 'cancelled')),
  attempts      int NOT NULL DEFAULT 0,
  last_error    text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  processed_at  timestamptz
);

-- The poller's claim query: WHERE status = 'pending' AND scheduled_for <= now()
CREATE INDEX IF NOT EXISTS idx_scheduled_events_due
  ON scheduled_events (scheduled_for)
  WHERE status = 'pending';

ALTER TABLE scheduled_events ENABLE ROW LEVEL SECURITY;
