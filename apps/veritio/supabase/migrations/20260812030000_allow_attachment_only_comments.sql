-- Allow a comment that carries only attachments.
--
-- `study_comments_content_check` required length(content) >= 1, which predates
-- attachments existing at all. Posting a screenshot with no accompanying text
-- is a normal thing to do, and it failed at the database with
-- "violates check constraint study_comments_content_check" — after the file had
-- already uploaded, so the user saw a thumbnail and then a failed send.
--
-- The length ceiling is kept; only the floor becomes conditional. Text-free AND
-- attachment-free comments are still rejected, so the column can't silently
-- fill with empty rows.

ALTER TABLE public.study_comments
  DROP CONSTRAINT IF EXISTS study_comments_content_check;

ALTER TABLE public.study_comments
  ADD CONSTRAINT study_comments_content_check
  CHECK (
    length(content) <= 10000
    AND (
      length(content) >= 1
      -- jsonb_typeof guard: jsonb_array_length() raises if the value is not an
      -- array, which would turn a malformed write into a constraint error that
      -- reads like corruption.
      OR (
        jsonb_typeof(attachments) = 'array'
        AND jsonb_array_length(attachments) > 0
      )
    )
  );
