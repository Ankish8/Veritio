-- Per-user notification channel preferences, and retention for the inbox.
--
-- Two preference models already exist and are deliberately kept apart, because
-- they answer different questions:
--
--   studies.email_notification_settings  = "what this study emails its owner
--                                           about" (responses, milestones,
--                                           digest, close)
--   user_notification_preferences        = "how I want to be reached", per
--                                           category, per channel
--
-- A third model would be the point where this becomes unmaintainable, so the
-- per-user mention flag on user_preferences is folded in here and dropped.

CREATE TABLE IF NOT EXISTS public.user_notification_preferences (
  user_id TEXT NOT NULL,
  -- Matches notifications.category. A person mutes a category, never a type —
  -- nobody wants to toggle sixteen individual notification types.
  category TEXT NOT NULL CHECK (category IN ('mention', 'study', 'job', 'system', 'billing')),
  in_app BOOLEAN NOT NULL DEFAULT TRUE,
  email BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, category)
);

-- Rows are written only when someone changes a default, so absence means
-- "default on" and the table stays small.

-- Carry over the existing per-user mention-email choice so nobody silently
-- gets re-subscribed to something they turned off.
INSERT INTO public.user_notification_preferences (user_id, category, in_app, email)
SELECT user_id, 'mention', TRUE, COALESCE(comment_mention_emails, TRUE)
FROM public.user_preferences
WHERE comment_mention_emails IS NOT NULL
  AND comment_mention_emails = FALSE
ON CONFLICT (user_id, category) DO NOTHING;

-- The old column is superseded. Kept (not dropped) for one release so a
-- rollback doesn't lose the setting; drop it in a follow-up once this is live.
COMMENT ON COLUMN public.user_preferences.comment_mention_emails IS
  'DEPRECATED — superseded by user_notification_preferences (category=mention, email). Read from there.';

ALTER TABLE public.user_notification_preferences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS service_role_postgres_full_access ON public.user_notification_preferences;
CREATE POLICY service_role_postgres_full_access
  ON public.user_notification_preferences
  FOR ALL TO service_role, postgres USING (true) WITH CHECK (true);

GRANT ALL ON public.user_notification_preferences TO service_role;

DROP TRIGGER IF EXISTS user_notification_preferences_updated_at
  ON public.user_notification_preferences;
CREATE TRIGGER user_notification_preferences_updated_at
  BEFORE UPDATE ON public.user_notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
