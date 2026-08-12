/**
 * The create-comment contract.
 *
 * These pin the rule that broke in production: an attachment-only comment is
 * valid. The Zod schema was relaxed to allow it while the database still
 * enforced length(content) >= 1, so the upload succeeded and the send then
 * failed at the constraint. The DB check is now
 * `length(content) <= 10000 AND (length(content) >= 1 OR attachments non-empty)`
 * (20260812030000_allow_attachment_only_comments.sql) — these tests keep the
 * schema saying the same thing.
 */
import { describe, it, expect } from 'vitest'
import { createCommentSchema } from '../collaboration-types'

const ATTACHMENT = {
  url: 'https://example.com/a.png',
  path: 'study/attachments/a.png',
  filename: 'a.png',
  size: 1234,
  mimeType: 'image/png',
}

describe('createCommentSchema', () => {
  it('accepts text with no attachments', () => {
    expect(createCommentSchema.safeParse({ content: 'hello' }).success).toBe(true)
  })

  it('accepts an attachment with no text', () => {
    const result = createCommentSchema.safeParse({ content: '', attachments: [ATTACHMENT] })
    expect(result.success).toBe(true)
  })

  it('accepts whitespace-only text when an attachment is present', () => {
    expect(
      createCommentSchema.safeParse({ content: '   ', attachments: [ATTACHMENT] }).success
    ).toBe(true)
  })

  it('rejects empty text with no attachments', () => {
    const result = createCommentSchema.safeParse({ content: '' })
    expect(result.success).toBe(false)
  })

  it('rejects whitespace-only text with an empty attachment array', () => {
    const result = createCommentSchema.safeParse({ content: '  ', attachments: [] })
    expect(result.success).toBe(false)
  })

  it('rejects text over the length ceiling', () => {
    expect(createCommentSchema.safeParse({ content: 'x'.repeat(10001) }).success).toBe(false)
  })

  it('rejects a malformed attachment descriptor', () => {
    expect(
      createCommentSchema.safeParse({
        content: '',
        attachments: [{ ...ATTACHMENT, url: 'not-a-url' }],
      }).success
    ).toBe(false)
  })

  it('caps how many files ride on one comment', () => {
    expect(
      createCommentSchema.safeParse({
        content: 'many',
        attachments: Array.from({ length: 11 }, () => ATTACHMENT),
      }).success
    ).toBe(false)
  })

  it('accepts a reply carrying an attachment', () => {
    expect(
      createCommentSchema.safeParse({
        content: '',
        parent_comment_id: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
        attachments: [ATTACHMENT],
      }).success
    ).toBe(true)
  })
})
