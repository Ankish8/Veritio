-- ================================================================
-- Migration: Add Public Read Policies for Prototype Test Tables
-- Description: Allow anonymous users (participants) to read prototype data
-- This fixes the issue where SSR with anon key couldn't fetch prototype data
-- ================================================================

-- Allow public read access to prototypes (for participants)
CREATE POLICY "Anyone can read prototype test prototypes"
  ON prototype_test_prototypes FOR SELECT
  USING (true);

-- Allow public read access to frames (for participants)
CREATE POLICY "Anyone can read prototype test frames"
  ON prototype_test_frames FOR SELECT
  USING (true);

-- Allow public read access to tasks (for participants)
CREATE POLICY "Anyone can read prototype test tasks"
  ON prototype_test_tasks FOR SELECT
  USING (true);

-- Note: Sessions, task attempts, click events, and navigation events
-- remain restricted - participants can only insert (via service role),
-- and study owners can only view their own data.
