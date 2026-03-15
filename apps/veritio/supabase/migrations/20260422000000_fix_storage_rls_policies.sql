-- Fix storage RLS policies to enforce path ownership
-- Users may only upload/update/delete files in their own study paths or avatars.

-- Drop existing permissive policies (idempotent)
DROP POLICY IF EXISTS "Allow uploads to study-assets" ON storage.objects;
DROP POLICY IF EXISTS "Allow updates to study-assets" ON storage.objects;
DROP POLICY IF EXISTS "Allow deletes from study-assets" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload to their own studies" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own study files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own study files" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload to their studies" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their study files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their study files" ON storage.objects;

-- Users can only upload to their own studies or avatars
CREATE POLICY "Users can upload to their studies"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'study-assets'
    AND (
      -- Avatar uploads: avatars/{userId}/*
      (
        (storage.foldername(name))[1] = 'avatars'
        AND (storage.foldername(name))[2] = current_setting('request.jwt.claims', true)::json->>'sub'
      )
      OR (
        -- Study uploads: {studyId}/*
        EXISTS (
          SELECT 1 FROM studies s
          JOIN projects p ON s.project_id = p.id
          LEFT JOIN organization_members om
            ON p.organization_id = om.organization_id
            AND om.joined_at IS NOT NULL
          WHERE s.id::text = (storage.foldername(name))[1]
            AND (
              p.user_id = current_setting('request.jwt.claims', true)::json->>'sub'
              OR om.user_id = current_setting('request.jwt.claims', true)::json->>'sub'
            )
        )
      )
    )
  );

-- Users can update only their own study files or avatars
CREATE POLICY "Users can update their study files"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'study-assets'
    AND (
      (
        (storage.foldername(name))[1] = 'avatars'
        AND (storage.foldername(name))[2] = current_setting('request.jwt.claims', true)::json->>'sub'
      )
      OR (
        EXISTS (
          SELECT 1 FROM studies s
          JOIN projects p ON s.project_id = p.id
          LEFT JOIN organization_members om
            ON p.organization_id = om.organization_id
            AND om.joined_at IS NOT NULL
          WHERE s.id::text = (storage.foldername(name))[1]
            AND (
              p.user_id = current_setting('request.jwt.claims', true)::json->>'sub'
              OR om.user_id = current_setting('request.jwt.claims', true)::json->>'sub'
            )
        )
      )
    )
  )
  WITH CHECK (
    bucket_id = 'study-assets'
    AND (
      (
        (storage.foldername(name))[1] = 'avatars'
        AND (storage.foldername(name))[2] = current_setting('request.jwt.claims', true)::json->>'sub'
      )
      OR (
        EXISTS (
          SELECT 1 FROM studies s
          JOIN projects p ON s.project_id = p.id
          LEFT JOIN organization_members om
            ON p.organization_id = om.organization_id
            AND om.joined_at IS NOT NULL
          WHERE s.id::text = (storage.foldername(name))[1]
            AND (
              p.user_id = current_setting('request.jwt.claims', true)::json->>'sub'
              OR om.user_id = current_setting('request.jwt.claims', true)::json->>'sub'
            )
        )
      )
    )
  );

-- Users can delete only their own study files or avatars
CREATE POLICY "Users can delete their study files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'study-assets'
    AND (
      (
        (storage.foldername(name))[1] = 'avatars'
        AND (storage.foldername(name))[2] = current_setting('request.jwt.claims', true)::json->>'sub'
      )
      OR (
        EXISTS (
          SELECT 1 FROM studies s
          JOIN projects p ON s.project_id = p.id
          LEFT JOIN organization_members om
            ON p.organization_id = om.organization_id
            AND om.joined_at IS NOT NULL
          WHERE s.id::text = (storage.foldername(name))[1]
            AND (
              p.user_id = current_setting('request.jwt.claims', true)::json->>'sub'
              OR om.user_id = current_setting('request.jwt.claims', true)::json->>'sub'
            )
        )
      )
    )
  );
