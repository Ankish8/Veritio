-- Durable record of education access requests, plus a note on extra_seats.
--
-- 1. education_access_requests
--    The /education form emails support@veritio.io and fires a PostHog event.
--    Both are fine signals and neither is a record you can query: if Resend
--    drops a message the lead is gone, and PostHog is not where you look up
--    "which institutions asked, and when". This table is the durable copy.
--
--    Write-only for anon on purpose. The landing route inserts with the anon
--    key held server-side (never NEXT_PUBLIC_, so it stays out of the client
--    bundle), and reading is service_role only, which bypasses RLS. A leaked
--    anon key would therefore let someone add junk rows but never read a
--    single lead — the same exposure the existing widget-impressions and
--    flow-responses intake tables already accept.

CREATE TABLE IF NOT EXISTS education_access_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  institution text NOT NULL,
  programme text,
  course text,
  cohort_size integer,
  term_starts text,          -- free text: faculty write "January 2027", not a date
  tier text,                 -- the size they self-selected on the form
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE education_access_requests IS
  'Leads from the /education request form. Written by the landing intake route; read by service_role only.';

CREATE INDEX IF NOT EXISTS idx_education_access_requests_created
  ON education_access_requests (created_at DESC);

ALTER TABLE education_access_requests ENABLE ROW LEVEL SECURITY;

-- Insert-only for the public intake path. No SELECT/UPDATE/DELETE policy
-- exists, so anon and authenticated cannot read or alter what is stored.
DROP POLICY IF EXISTS "Public can submit education access requests" ON education_access_requests;
CREATE POLICY "Public can submit education access requests"
  ON education_access_requests FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    length(name) BETWEEN 1 AND 120
    AND length(email) BETWEEN 3 AND 200
    AND length(institution) BETWEEN 1 AND 200
    AND (notes IS NULL OR length(notes) <= 2000)
    AND (cohort_size IS NULL OR cohort_size BETWEEN 1 AND 100000)
  );

-- 2. extra_seats now carries two meanings, so say so where the schema is read.
--    On team it is paid add-on seats billed through Polar; on an education
--    license it is how far the contracted cohort exceeds the tier's base size,
--    and is never billed per seat (the billing routes reject education orgs).
COMMENT ON COLUMN organizations.extra_seats IS
  'Seats beyond the plan base. On team: paid add-ons billed via Polar. On edu_*: the contracted cohort size above the tier base, never billed per seat.';
