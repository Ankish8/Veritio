-- Add demographic_profile to identifier_type CHECK constraint
-- This allows studies that use demographic profiling to create participants

-- Drop the existing constraint and add a new one with demographic_profile
ALTER TABLE participants
  DROP CONSTRAINT IF EXISTS participants_identifier_type_check;

ALTER TABLE participants
  ADD CONSTRAINT participants_identifier_type_check
  CHECK (identifier_type IN ('anonymous', 'email', 'custom', 'demographic_profile'));
