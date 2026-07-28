import { describe, expect, it, vi } from 'vitest'
import { getStudyByShareCode } from './study-access'

vi.mock('../ab-test-service', () => ({
  getABTestsForStudy: vi.fn().mockResolvedValue({ data: [] }),
  assignVariant: vi.fn().mockReturnValue('A'),
}))

vi.mock('../../lib/supabase/motia-client', () => ({
  getMotiaSupabaseClient: () => {
    throw new Error('no admin client in tests')
  },
}))

/**
 * Thenable PostgREST-style builder: every chainable method returns itself, and
 * awaiting it (or calling single/maybeSingle) yields the canned result.
 */
function makeQuery(result: { data: unknown; error: unknown }) {
  const q: Record<string, unknown> = {}
  for (const method of ['select', 'or', 'eq', 'order', 'limit']) {
    q[method] = vi.fn(() => q)
  }
  q.single = vi.fn().mockResolvedValue(result)
  q.maybeSingle = vi.fn().mockResolvedValue(result)
  q.then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject)
  return q
}

function fullStudyClient(
  studyRow: Record<string, unknown>,
  tableData: Record<string, unknown[]> = {},
) {
  const seenTables: string[] = []
  const client = {
    from: vi.fn((table: string) => {
      seenTables.push(table)
      return table === 'studies'
        ? makeQuery({ data: studyRow, error: null })
        : makeQuery({ data: tableData[table] ?? [], error: null })
    }),
  }
  return { client, seenTables }
}

function basicStudyClient(study: Record<string, unknown>) {
  const query = {
    select: vi.fn(),
    or: vi.fn(),
    single: vi.fn().mockResolvedValue({ data: study, error: null }),
  }
  query.select.mockReturnValue(query)
  query.or.mockReturnValue(query)
  return {
    client: { from: vi.fn().mockReturnValue(query) },
    query,
  }
}

describe('participant study access appearance context', () => {
  it('retains branding for a closed study without exposing its full payload', async () => {
    const branding = {
      background: {
        mode: 'color',
        color: '#123456',
        layout: 'fill',
        position: 'center',
        overlayOpacity: 0,
        contentSurface: 'solid',
      },
    }
    const { client } = basicStudyClient({
      id: 'study-1',
      title: 'Closed study',
      status: 'completed',
      password: null,
      branding,
      study_type: 'survey',
      response_prevention_settings: null,
    })

    const result = await getStudyByShareCode(client as never, 'closed-study')

    expect(result.data).toBeNull()
    expect(result.error?.message).toContain('completed')
    expect(result.failureContext).toEqual({
      studyId: 'study-1',
      title: 'Closed study',
      branding,
    })
  })

  it('retains branding after an incorrect password', async () => {
    const branding = {
      background: {
        mode: 'image',
        layout: 'fit',
        position: 'center',
        overlayOpacity: 20,
        contentSurface: 'glass',
      },
    }
    const { client } = basicStudyClient({
      id: 'study-2',
      title: 'Protected study',
      status: 'active',
      password: 'correct-password',
      branding,
      study_type: 'survey',
      response_prevention_settings: null,
    })

    const result = await getStudyByShareCode(client as never, 'protected-study', 'wrong-password')

    expect(result.error?.message).toBe('Incorrect password')
    expect(result.failureContext?.branding).toEqual(branding)
  })
})

describe('participant study payload', () => {
  const activeStudy = {
    id: 'study-3',
    title: 'Open survey',
    description: 'desc',
    purpose: 'purpose',
    participant_requirements: null,
    study_type: 'survey',
    status: 'active',
    settings: {},
    welcome_message: null,
    thank_you_message: null,
    branding: {},
    language: 'en-US',
    response_prevention_settings: null,
    session_recording_settings: null,
    password: null,
  }

  it('never leaks the study password into the participant payload', async () => {
    // The single merged lookup selects `password` for the access gate, and the
    // payload below is serialized straight into the SSR HTML, so the strip is
    // a security boundary rather than a tidiness concern.
    const { client } = fullStudyClient({ ...activeStudy, password: 'hunter2' })

    const result = await getStudyByShareCode(client as never, 'open-survey', 'hunter2')

    expect(result.error).toBeNull()
    expect(result.data).not.toBeNull()
    expect(result.data).not.toHaveProperty('password')
    expect(JSON.stringify(result.data)).not.toContain('hunter2')
  })

  it('reads the study row once instead of re-fetching it by id', async () => {
    const { client, seenTables } = fullStudyClient(activeStudy)

    await getStudyByShareCode(client as never, 'open-survey')

    expect(seenTables.filter((t) => t === 'studies')).toHaveLength(1)
  })

  it('loads card sort relations via direct study_id lookups', async () => {
    const { client, seenTables } = fullStudyClient(
      { ...activeStudy, study_type: 'card_sort' },
      {
        cards: [{ id: 'c1', study_id: 'study-3' }],
        categories: [{ id: 'cat1', study_id: 'study-3' }],
      },
    )

    const result = await getStudyByShareCode(client as never, 'open-card-sort')

    expect(seenTables).toContain('cards')
    expect(seenTables).toContain('categories')
    expect((result.data as { cards: unknown[] }).cards).toHaveLength(1)
    expect((result.data as { categories: unknown[] }).categories).toHaveLength(1)
  })

  it('does not query card sort or tree test relations for a survey', async () => {
    const { client, seenTables } = fullStudyClient(activeStudy)

    await getStudyByShareCode(client as never, 'open-survey')

    expect(seenTables).not.toContain('cards')
    expect(seenTables).not.toContain('tree_nodes')
  })
})
