-- Migration: Add storage bucket and RLS policies for study assets
-- This enables logo uploads, social images, and file attachments
--
-- NOTE: Since this app uses Clerk for auth (not Supabase Auth), we can't use
-- auth.uid() in policies. Security is enforced at the application layer:
-- 1. Clerk auth middleware validates user identity
-- 2. Study ownership is checked before showing upload UI
-- 3. File paths include UUIDs to prevent guessing
-- 4. Bucket restricts allowed MIME types

-- Create the study-assets bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'study-assets',
  'study-assets',
  true,  -- Public bucket so URLs can be shared with participants
  10485760,  -- 10MB max file size
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/svg+xml', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Drop existing policies if they exist (idempotent)
DROP POLICY IF EXISTS "Allow uploads to study-assets" ON storage.objects;
DROP POLICY IF EXISTS "Allow updates to study-assets" ON storage.objects;
DROP POLICY IF EXISTS "Allow deletes from study-assets" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for study assets" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload to their own studies" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own study files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own study files" ON storage.objects;

-- Policy: Allow uploads to study-assets bucket
-- Security is enforced at app layer via Clerk auth
CREATE POLICY "Allow uploads to study-assets"
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'study-assets');

-- Policy: Allow updates to study-assets files
CREATE POLICY "Allow updates to study-assets"
ON storage.objects
FOR UPDATE
TO anon, authenticated
USING (bucket_id = 'study-assets');

-- Policy: Allow deletes from study-assets
CREATE POLICY "Allow deletes from study-assets"
ON storage.objects
FOR DELETE
TO anon, authenticated
USING (bucket_id = 'study-assets');

-- Policy: Allow public read access (for participants to view logos)
CREATE POLICY "Public read access for study assets"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'study-assets');
