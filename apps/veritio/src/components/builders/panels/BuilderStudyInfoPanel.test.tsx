import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BuilderStudyInfoPanel } from './BuilderStudyInfoPanel'

/**
 * Regression guard: the panel used to read `meta.participantCount`, a field the
 * builder never populated (the studies table has no participant_count column and
 * the builder's loadMetaFromStudy call omitted it), so a live study with real
 * responses always rendered "Total responses 0".
 */

const storeState = vi.hoisted(() => ({
  meta: {
    status: 'active' as string,
    createdAt: '2026-07-28T10:00:00.000Z',
    updatedAt: '2026-07-29T10:00:00.000Z',
    launchedAt: '2026-07-28T12:00:00.000Z',
    closingRule: { type: 'none' } as Record<string, unknown>,
    language: 'en-US',
    password: null as string | null,
    sessionRecordingSettings: { enabled: false },
  },
  loadFromStudy: vi.fn(),
}))

const realtimeState = vi.hoisted(() => ({
  stats: {
    total: 3,
    completed: 2,
    inProgress: 1,
    abandoned: 0,
    screened: 0,
    completionRate: 67,
    averageDurationSeconds: 245,
    lastResponseAt: '2026-07-29T09:30:00.000Z',
  },
  isLoading: false,
  isConnected: true,
  error: null as string | null,
  refresh: vi.fn(),
}))

const useRealtimeParticipants = vi.hoisted(() => vi.fn())

vi.mock('@/stores/study-meta-store', () => ({
  useStudyMetaStore: () => storeState,
}))

vi.mock('@/hooks', () => ({
  useAuthFetch: () => vi.fn(),
  useRealtimeParticipants: useRealtimeParticipants,
}))

vi.mock('@/components/ui/sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

async function renderPanel() {
  const container = document.createElement('div')
  document.body.appendChild(container)
  await act(async () => {
    createRoot(container).render(
      <BuilderStudyInfoPanel studyType="card_sort" studyId="study-1" />,
    )
  })
  return container
}

describe('BuilderStudyInfoPanel response stats', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useRealtimeParticipants.mockReturnValue(realtimeState)
    storeState.meta.status = 'active'
    storeState.meta.password = null
    storeState.meta.sessionRecordingSettings = { enabled: false }
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('renders the live participant total rather than a store field', async () => {
    const container = await renderPanel()

    expect(useRealtimeParticipants).toHaveBeenCalledWith('study-1', {
      enabled: true,
    })

    const text = container.textContent ?? ''
    expect(text).toContain('Total')
    expect(text).toContain('3')
    expect(text).toContain('Completed')
    expect(text).toContain('Completion rate')
    expect(text).toContain('67%')
  })

  it('formats the average completion time in minutes and seconds', async () => {
    const container = await renderPanel()
    expect(container.textContent).toContain('4m 5s')
  })

  it('states that no auto-close is configured for a live study', async () => {
    const container = await renderPanel()
    expect(container.textContent).toContain('No auto-close set')
  })

  it('shows a placeholder instead of a misleading zero while stats load', async () => {
    useRealtimeParticipants.mockReturnValue({
      ...realtimeState,
      stats: {
        total: 0,
        completed: 0,
        inProgress: 0,
        abandoned: 0,
        screened: 0,
        completionRate: 0,
        averageDurationSeconds: null,
        lastResponseAt: null,
      },
      isLoading: true,
    })

    const container = await renderPanel()
    const text = container.textContent ?? ''
    expect(text).toContain('Total')
    expect(text).not.toContain('Completion rate')
  })

  it('skips the stats fetch for drafts, which cannot have responses', async () => {
    storeState.meta.status = 'draft'
    const container = await renderPanel()

    expect(useRealtimeParticipants).toHaveBeenCalledWith('study-1', {
      enabled: false,
    })
    expect(container.textContent).not.toContain('Total responses')
  })

  it('surfaces password protection and recording only when enabled', async () => {
    storeState.meta.password = 'hunter2'
    storeState.meta.sessionRecordingSettings = { enabled: true }

    const container = await renderPanel()
    const text = container.textContent ?? ''
    expect(text).toContain('Password protected')
    expect(text).toContain('Session recording')
    // The password value itself must never reach the panel
    expect(text).not.toContain('hunter2')
  })
})
