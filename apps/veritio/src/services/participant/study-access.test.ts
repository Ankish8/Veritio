import { describe, expect, it, vi } from 'vitest'
import { getStudyByShareCode } from './study-access'

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
