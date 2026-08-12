/**
 * Tests for comment notification targeting.
 *
 * The rules that matter: never notify people about their own comment, never
 * notify the same person twice, and let a per-user preference or a recent
 * email suppress the email without suppressing the in-app record.
 */
import { describe, it, expect } from 'vitest'
import {
  resolveCommentNotificationTargets,
  buildPreview,
} from '../comment-notification-service'

const AUTHOR = 'user-author'
const ALICE = 'user-alice'
const BOB = 'user-bob'
const STUDY = '3f5b2c10-0000-4000-8000-abcdef123456'

/**
 * Minimal Supabase stand-in. Each `from()` returns a thenable chain whose
 * terminal value is whatever the table fixture says.
 */
function fakeSupabase(fixtures: {
  rootAuthor?: string | null
  replyAuthors?: string[]
  optedOut?: string[]
  recentlyEmailed?: string[]
}) {
  const {
    rootAuthor = null,
    replyAuthors = [],
    optedOut = [],
    recentlyEmailed = [],
  } = fixtures

  const builder = (result: unknown) => {
    const chain: any = {}
    for (const m of ['select', 'eq', 'neq', 'in', 'gt', 'not']) {
      chain[m] = () => chain
    }
    chain.maybeSingle = async () => ({ data: result, error: null })
    chain.then = (resolve: (v: unknown) => unknown) =>
      Promise.resolve({ data: result, error: null }).then(resolve)
    return chain
  }

  let commentsCall = 0

  return {
    from(table: string) {
      if (table === 'study_comments') {
        commentsCall += 1
        // First study_comments read is the root comment (maybeSingle),
        // second is the sibling replies list.
        return commentsCall === 1
          ? builder(rootAuthor ? { author_user_id: rootAuthor } : null)
          : builder(replyAuthors.map((id) => ({ author_user_id: id })))
      }
      if (table === 'user_preferences') {
        return builder(optedOut.map((id) => ({ user_id: id, comment_mention_emails: false })))
      }
      if (table === 'notifications') {
        return builder(recentlyEmailed.map((id) => ({ user_id: id })))
      }
      return builder([])
    },
  } as any
}

const base = {
  commentId: 'comment-1',
  studyId: STUDY,
  authorUserId: AUTHOR,
  parentCommentId: null as string | null,
}

describe('resolveCommentNotificationTargets', () => {
  it('notifies mentioned users', async () => {
    const targets = await resolveCommentNotificationTargets(fakeSupabase({}), {
      ...base,
      mentions: [ALICE, BOB],
    })

    expect(targets.map((t) => t.userId).sort()).toEqual([ALICE, BOB].sort())
    expect(targets.every((t) => t.reason === 'mention')).toBe(true)
    expect(targets.every((t) => t.email)).toBe(true)
  })

  it('never notifies the author of their own comment', async () => {
    const targets = await resolveCommentNotificationTargets(fakeSupabase({}), {
      ...base,
      mentions: [AUTHOR, ALICE],
    })

    expect(targets.map((t) => t.userId)).toEqual([ALICE])
  })

  it('returns nothing when the only mention is the author', async () => {
    const targets = await resolveCommentNotificationTargets(fakeSupabase({}), {
      ...base,
      mentions: [AUTHOR],
    })

    expect(targets).toEqual([])
  })

  it('notifies thread participants on a reply, excluding the replier', async () => {
    const targets = await resolveCommentNotificationTargets(
      fakeSupabase({ rootAuthor: ALICE, replyAuthors: [BOB, AUTHOR] }),
      { ...base, mentions: [], parentCommentId: 'parent-1' }
    )

    expect(targets.map((t) => t.userId).sort()).toEqual([ALICE, BOB].sort())
    expect(targets.every((t) => t.reason === 'reply')).toBe(true)
  })

  it('dedupes someone both mentioned and in the thread, preferring mention', async () => {
    const targets = await resolveCommentNotificationTargets(
      fakeSupabase({ rootAuthor: ALICE, replyAuthors: [ALICE] }),
      { ...base, mentions: [ALICE], parentCommentId: 'parent-1' }
    )

    expect(targets).toHaveLength(1)
    expect(targets[0]).toMatchObject({ userId: ALICE, reason: 'mention' })
  })

  it('suppresses email but keeps the target when the user opted out', async () => {
    const targets = await resolveCommentNotificationTargets(
      fakeSupabase({ optedOut: [ALICE] }),
      { ...base, mentions: [ALICE, BOB] }
    )

    expect(targets.find((t) => t.userId === ALICE)!.email).toBe(false)
    expect(targets.find((t) => t.userId === BOB)!.email).toBe(true)
    // The in-app notification still happens for both.
    expect(targets).toHaveLength(2)
  })

  it('suppresses email for someone emailed about this study recently', async () => {
    const targets = await resolveCommentNotificationTargets(
      fakeSupabase({ recentlyEmailed: [BOB] }),
      { ...base, mentions: [ALICE, BOB] }
    )

    expect(targets.find((t) => t.userId === BOB)!.email).toBe(false)
    expect(targets.find((t) => t.userId === ALICE)!.email).toBe(true)
  })

  it('returns nothing when there are no mentions and no thread', async () => {
    const targets = await resolveCommentNotificationTargets(fakeSupabase({}), {
      ...base,
      mentions: [],
    })

    expect(targets).toEqual([])
  })
})

describe('buildPreview', () => {
  it('flattens mention markup to readable @names', () => {
    expect(buildPreview('hey @[Ada Lovelace](user-1) look')).toBe('hey @Ada Lovelace look')
  })

  it('never leaks a user id into the preview', () => {
    expect(buildPreview('@[Ada](7c9e6679-7425-40de-944b-e07fc1f90ae7)')).not.toContain('7c9e6679')
  })

  it('collapses whitespace and newlines', () => {
    expect(buildPreview('a\n\n  b   c')).toBe('a b c')
  })

  it('truncates long bodies with an ellipsis', () => {
    const preview = buildPreview('x'.repeat(500), 50)
    expect(preview).toHaveLength(50)
    expect(preview.endsWith('…')).toBe(true)
  })

  it('leaves short bodies intact', () => {
    expect(buildPreview('short')).toBe('short')
  })
})
