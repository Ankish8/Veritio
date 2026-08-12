-- Per-user preference for comment mention emails.
--
-- Lives on user_preferences rather than studies.email_notification_settings
-- because "do I want to be emailed when someone @s me" is a property of the
-- person, not of each study they happen to collaborate on. The per-study JSON
-- settings stay what they are: response/milestone/digest triggers owned by the
-- study's researcher.
--
-- Defaults to TRUE: a mention is a direct request for someone's attention, and
-- an unnoticed one is the failure mode that makes a comment feature feel dead.
-- In-app notifications are always recorded regardless of this flag; it gates
-- email only.

ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS comment_mention_emails BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN public.user_preferences.comment_mention_emails IS
  'Email me when someone @mentions me in a study comment. In-app notifications are unaffected.';
