-- Add snapshot_path column to live_website_page_screenshots
ALTER TABLE live_website_page_screenshots ADD COLUMN IF NOT EXISTS snapshot_path TEXT;

-- Make screenshot_path nullable (rows may have only snapshot_path, no screenshot)
ALTER TABLE live_website_page_screenshots ALTER COLUMN screenshot_path DROP NOT NULL;

-- Create storage bucket for DOM snapshots (gzipped JSON)
INSERT INTO storage.buckets (id, name, public)
VALUES ('live-website-snapshots', 'live-website-snapshots', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access
CREATE POLICY "Public read access for live-website-snapshots"
ON storage.objects FOR SELECT
USING (bucket_id = 'live-website-snapshots');

-- Allow service_role insert/update
CREATE POLICY "Service role write access for live-website-snapshots"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'live-website-snapshots');

CREATE POLICY "Service role update access for live-website-snapshots"
ON storage.objects FOR UPDATE
USING (bucket_id = 'live-website-snapshots');
