/**
 * Tests for comments-service.
 *
 * Focused on the rules that were wrong in production and the ones that are
 * easy to regress silently: mention ids must be validated against real org
 * membership before they become notification targets, totalCount must be
 * computed on the first page, and resolution belongs to the thread root.
 */
import { describe, it, expect, vi } from 'vitest'

vi.mock('../permission-service', () => ({
  getStudyPermission: vi.fn(async () => ({
    data: { role: mockRole, organizationId: 'org-1' },
    error: null,
  })),
}))
vi.mock('../entitlements-service', () => ({
  assertStudyFeature: vi.fn(async () => undefined),
}))
vi.mock('../../lib/user/display-name', () => ({
  formatDisplayName: (u: { name?: string | null }) => u.name ?? 'Someone',
}))
vi.mock('../../lib/user/display-name-preferences.server', () => ({
  fetchDisplayNamePreferences: async () => new Map(),
}))

let mockRole = 'viewer'

import {
  resolveMentionedUserIds,
  setCommentResolved,
  toggleCommentReaction,
  listStudyComments,
  ALLOWED_REACTIONS,
} from '../comments-service'

const UUID_MEMBER = '7c9e6679-7425-40de-944b-e07fc1f90ae7'
const UUID_OUTSIDER = 'b1a7f3c2-1111-4a2b-9c3d-0e5f6a7b8c9d'

/** Chainable Supabase stub whose terminal value is supplied per table. */
function stub(tables: Record<string, unknown>) {
  const chain = (result: unknown) => {
    const c: any = {}
    for (const m of ['select', 'eq', 'neq', 'in', 'gt', 'lt', 'order', 'limit', 'update', 'insert', 'delete']) {
      c[m] = () => c
    }
    c.single = async () => ({ data: result, error: result ? null : { code: 'PGRST116' } })
    c.maybeSingle = async () => ({ data: result, error: null })
    c.then = (r: (v: unknown) => unknown) =>
      Promise.resolve({ data: result, error: null }).then(r)
    return c
  }
  return { from: (t: string) => chain(tables[t] ?? null) } as any
}

describe('resolveMentionedUserIds', () => {
  it('keeps only ids that are real members of the study organization', async () => {
    const supabase = stub({ organization_members: [{ user_id: UUID_MEMBER }] })

    const ids = await resolveMentionedUserIds(
      supabase,
      'org-1',
      `hi @[Member](${UUID_MEMBER}) and @[Outsider](${UUID_OUTSIDER})`
    )

    expect(ids).toEqual([UUID_MEMBER])
    // The crafted id never becomes a notification target.
    expect(ids).not.toContain(UUID_OUTSIDER)
  })

  it('returns nothing when the org cannot be resolved, rather than trusting the body', async () => {
    const supabase = stub({ organization_members: [{ user_id: UUID_MEMBER }] })
    expect(await resolveMentionedUserIds(supabase, null, `@[X](${UUID_MEMBER})`)).toEqual([])
  })

  it('returns nothing for a body with no mentions', async () => {
    const supabase = stub({ organization_members: [] })
    expect(await resolveMentionedUserIds(supabase, 'org-1', 'plain text @notamention')).toEqual([])
  })
})

describe('setCommentResolved', () => {
  it('refuses to resolve a reply — resolution belongs to the thread root', async () => {
    mockRole = 'editor'
    const supabase = stub({
      study_comments: { study_id: 's1', is_deleted: false, parent_comment_id: 'root-1' },
    })

    const { data, error } = await setCommentResolved(supabase, 'reply-1', 'u1', true)

    expect(data).toBeNull()
    expect(error?.message).toMatch(/thread root/i)
  })

  it('refuses to resolve a deleted comment', async () => {
    mockRole = 'editor'
    const supabase = stub({
      study_comments: { study_id: 's1', is_deleted: true, parent_comment_id: null },
    })

    const { error } = await setCommentResolved(supabase, 'c1', 'u1', true)
    expect(error?.message).toMatch(/deleted/i)
  })

  it('reports not found for a missing comment', async () => {
    mockRole = 'editor'
    const { error } = await setCommentResolved(stub({}), 'nope', 'u1', true)
    expect(error?.message).toMatch(/not found/i)
  })

  it('lets a viewer resolve, not just editors', async () => {
    mockRole = 'viewer'
    const supabase = stub({
      study_comments: { study_id: 's1', is_deleted: false, parent_comment_id: null, id: 'c1' },
    })

    const { error } = await setCommentResolved(supabase, 'c1', 'u1', true)
    expect(error).toBeNull()
  })
})

describe('toggleCommentReaction', () => {
  it('rejects an emoji outside the allowed set before touching the database', async () => {
    const { data, error } = await toggleCommentReaction(stub({}), 'c1', 'u1', '🚀')

    expect(data).toBeNull()
    expect(error?.message).toMatch(/unsupported/i)
  })

  it('accepts every emoji the UI offers', async () => {
    mockRole = 'viewer'
    for (const emoji of ALLOWED_REACTIONS) {
      const supabase = stub({
        study_comments: { study_id: 's1', is_deleted: false },
        study_comment_reactions: null,
      })
      const { error } = await toggleCommentReaction(supabase, 'c1', 'u1', emoji)
      expect(error, `emoji ${emoji} should be accepted`).toBeNull()
    }
  })

  it('removes an existing reaction instead of adding a duplicate', async () => {
    mockRole = 'viewer'
    const supabase = stub({
      study_comments: { study_id: 's1', is_deleted: false },
      study_comment_reactions: { id: 'r1' },
    })

    const { data } = await toggleCommentReaction(supabase, 'c1', 'u1', '👍')
    expect(data).toEqual({ reacted: false })
  })

  it('adds a reaction when none exists', async () => {
    mockRole = 'viewer'
    const supabase = stub({
      study_comments: { study_id: 's1', is_deleted: false },
      study_comment_reactions: null,
    })

    const { data } = await toggleCommentReaction(supabase, 'c1', 'u1', '👍')
    expect(data).toEqual({ reacted: true })
  })

  it('refuses to react to a deleted comment', async () => {
    mockRole = 'viewer'
    const supabase = stub({ study_comments: { study_id: 's1', is_deleted: true } })

    const { error } = await toggleCommentReaction(supabase, 'c1', 'u1', '👍')
    expect(error?.message).toMatch(/deleted/i)
  })
})

describe('listStudyComments pagination', () => {
  /**
   * Stub that distinguishes a head/count query from a row query, which is what
   * the totalCount regression turns on.
   */
  function paginationStub(rows: Array<Record<string, unknown>>, total: number) {
    return {
      from: () => {
        let isCount = false
        const c: any = {}
        c.select = (_cols?: string, opts?: { count?: string; head?: boolean }) => {
          if (opts?.head) isCount = true
          return c
        }
        for (const m of ['eq', 'neq', 'in', 'gt', 'lt', 'order', 'limit']) c[m] = () => c
        c.then = (resolve: (v: unknown) => unknown) =>
          Promise.resolve(
            isCount ? { count: total, error: null } : { data: rows, error: null }
          ).then(resolve)
        return c
      },
    } as any
  }

  it('reports totalCount on the FIRST page, not only on cursor pages', async () => {
    mockRole = 'viewer'
    const rows = [
      { id: 'c1', author_user_id: 'u1', created_at: '2026-01-01T00:00:00Z', study_id: 's1' },
    ]

    const { pagination } = await listStudyComments(paginationStub(rows, 42), 's1', 'u1', {
      limit: 30,
    })

    // Previously the count was only computed when `before`/`after` was set, so
    // this was 0 and the panel rendered "(-30 more)".
    expect(pagination?.totalCount).toBe(42)
  })

  it('never lets the panel derive a negative remaining count', async () => {
    mockRole = 'viewer'
    const rows = Array.from({ length: 3 }, (_, i) => ({
      id: `c${i}`,
      author_user_id: 'u1',
      created_at: `2026-01-0${i + 1}T00:00:00Z`,
      study_id: 's1',
    }))

    const { data, pagination } = await listStudyComments(paginationStub(rows, 3), 's1', 'u1', {
      limit: 30,
    })

    expect(pagination!.totalCount - (data?.length ?? 0)).toBeGreaterThanOrEqual(0)
  })
})

describe('ALLOWED_REACTIONS', () => {
  it('matches the six emoji the ReactionBar renders', () => {
    // Drift here means the picker offers emoji the API rejects.
    expect([...ALLOWED_REACTIONS]).toEqual(['👍', '✅', '👀', '🎉', '❤️', '🤔'])
  })
})
