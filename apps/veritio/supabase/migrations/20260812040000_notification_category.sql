-- Categories and grouping for the notification centre.
--
-- `category` is what a person actually mutes — nobody wants to toggle sixteen
-- individual types — and it drives the inbox's filter chips.
--
-- `group_key` is how high-frequency events avoid drowning the inbox. Events
-- sharing a key collapse into one row whose count lives in `metadata`, so a
-- 100-response study reads as "100 new responses in X" rather than a hundred
-- lines. Discrete events (a mention, an export finishing) leave it NULL and
-- never collapse.

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'system',
  ADD COLUMN IF NOT EXISTS group_key TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'notifications_category_check'
  ) THEN
    ALTER TABLE public.notifications
      ADD CONSTRAINT notifications_category_check
      CHECK (category IN ('mention', 'study', 'job', 'system', 'billing'));
  END IF;
END
$$;

-- Backfill the rows written before this column existed, by type. Cheap today
-- (the table is effectively empty) and keeps the filters honest if it isn't.
UPDATE public.notifications SET category = 'mention'
  WHERE category = 'system' AND type IN ('comment-mention', 'comment-reply');

UPDATE public.notifications SET category = 'study'
  WHERE category = 'system' AND type IN (
    'study-created', 'study-auto-closed', 'study-closed-manual', 'project-created',
    'analysis-complete', 'study-duplication-complete', 'study-duplication-failed',
    'recordings-deleted', 'retention-warning'
  );

UPDATE public.notifications SET category = 'job'
  WHERE category = 'system' AND type IN (
    'export-completed', 'export-failed', 'export_completed', 'export_failed'
  );

-- The two snake_case outliers, renamed so every type is kebab-case.
UPDATE public.notifications SET type = 'export-completed' WHERE type = 'export_completed';
UPDATE public.notifications SET type = 'export-failed'    WHERE type = 'export_failed';

-- Drives the inbox's per-category filter.
CREATE INDEX IF NOT EXISTS idx_notifications_user_category
  ON public.notifications (user_id, category, created_at DESC);

-- One live row per group per user; the partial predicate keeps the index small
-- since most notifications never group.
CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_group_key
  ON public.notifications (user_id, group_key)
  WHERE group_key IS NOT NULL;
