-- Warning state for trial expiry.
--
-- The trial sweep runs hourly. Without a marker, a "your trial ends in 3 days"
-- notice would fire 72 times. These columns mirror the term_warned_for /
-- term_warning_stage pair that already solves the same problem for education
-- licences, so both billing notices behave identically.
--
-- `trial_warned_for` stores the trial_ends_at the warning was sent for, so
-- extending a trial naturally resets the warnings rather than suppressing them.

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS trial_warned_for TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trial_warning_stage SMALLINT NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.organizations.trial_warned_for IS
  'The trial_ends_at value the most recent trial warning was sent for; extending the trial resets warnings.';
COMMENT ON COLUMN public.organizations.trial_warning_stage IS
  '0 = none sent, 1 = 3-day notice sent, 2 = final (1-day) notice sent.';

-- Supports the daily warning sweep without scanning every organization.
CREATE INDEX IF NOT EXISTS idx_orgs_trial_warning_pending
  ON public.organizations (trial_ends_at)
  WHERE plan_status = 'trialing' AND trial_ends_at IS NOT NULL;
