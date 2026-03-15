-- Live Website Page Screenshots
-- Stores screenshot captures from snippet/proxy for click map analysis

CREATE TABLE IF NOT EXISTS live_website_page_screenshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  study_id UUID NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
  page_url TEXT NOT NULL,
  screenshot_path TEXT NOT NULL,
  viewport_width INTEGER,
  viewport_height INTEGER,
  captured_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(study_id, page_url)
);

CREATE INDEX idx_lwps_study ON live_website_page_screenshots(study_id);

ALTER TABLE live_website_page_screenshots ENABLE ROW LEVEL SECURITY;

-- RLS: authenticated users can read screenshots for studies they own
CREATE POLICY "Users can read own study screenshots"
  ON live_website_page_screenshots
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM studies s
      JOIN projects p ON p.id = s.project_id
      JOIN organization_members om ON om.organization_id = p.organization_id
      WHERE s.id = live_website_page_screenshots.study_id
        AND om.user_id = auth.uid()
    )
  );

-- Service role can insert (used by the snippet upload endpoint)
CREATE POLICY "Service role can insert screenshots"
  ON live_website_page_screenshots
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Service role can delete
CREATE POLICY "Service role can delete screenshots"
  ON live_website_page_screenshots
  FOR DELETE
  TO service_role
  USING (true);

-- Storage bucket for screenshots (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('live-website-screenshots', 'live-website-screenshots', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: public read access for screenshot images
CREATE POLICY "Public read access for live website screenshots"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'live-website-screenshots');

-- Storage policy: service role can upload
CREATE POLICY "Service role can upload live website screenshots"
  ON storage.objects
  FOR INSERT
  TO service_role
  WITH CHECK (bucket_id = 'live-website-screenshots');

-- Storage policy: service role can delete
CREATE POLICY "Service role can delete live website screenshots"
  ON storage.objects
  FOR DELETE
  TO service_role
  USING (bucket_id = 'live-website-screenshots');
