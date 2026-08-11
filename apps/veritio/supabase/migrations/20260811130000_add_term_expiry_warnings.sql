-- Term-expiry warnings for education licenses.
--
-- An education license simply stops on access_ends_at. Enforcement is correct
-- but silent, so an institution's cohort loses access mid-course with no
-- warning. These two columns let a daily cron send a heads-up in time for a
-- finance office to raise a renewal PO.
--
-- The pair is deliberately (which-term, how-far-through) rather than a single
-- "warned at" timestamp: term_warned_for records the access_ends_at value the
-- stage refers to, so renewing a term (moving access_ends_at) makes the stored
-- stage stale automatically. Nothing has to remember to reset a flag — not
-- setOrgPlan, not a trigger, not an admin editing the row by hand in psql.

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS term_warned_for timestamptz,
  ADD COLUMN IF NOT EXISTS term_warning_stage smallint NOT NULL DEFAULT 0
    CHECK (term_warning_stage BETWEEN 0 AND 2);

COMMENT ON COLUMN organizations.term_warned_for IS
  'The access_ends_at value term_warning_stage refers to; a differing value means no warning has been sent for the current term.';
COMMENT ON COLUMN organizations.term_warning_stage IS
  '0 = none sent for term_warned_for, 1 = first (30-day) notice sent, 2 = final (7-day) notice sent.';

-- The sweep scans only termed orgs, which is a small slice of the table.
CREATE INDEX IF NOT EXISTS idx_orgs_term_warning_pending
  ON organizations (access_ends_at)
  WHERE access_ends_at IS NOT NULL;
