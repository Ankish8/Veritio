import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DetailsTab } from './details-tab'

const storeState = vi.hoisted(() => ({
  meta: {
    title: 'Table View',
    description: null as string | null,
    purpose: null as string | null,
    participantRequirements: null as string | null,
  },
  setTitle: vi.fn(),
  setDescription: vi.fn(),
  setPurpose: vi.fn(),
  setParticipantRequirements: vi.fn(),
}))

vi.mock('next/dynamic', () => ({
  default: () => () => <div data-testid="rich-text-editor" />,
}))

vi.mock('@/stores/study-meta-store', () => ({
  useStudyMetaStore: () => storeState,
}))

vi.mock('@/components/ai-refine', () => ({
  AiRefineButton: () => null,
  useAiRefineInline: () => ({
    toolbarButton: null,
    overlay: null,
  }),
}))

describe('DetailsTab initial field styling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('uses the shared input surfaces before collaboration connects', async () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)

    await act(async () => {
      root.render(
        <DetailsTab
          studyId="study-1"
          studyType="card_sort"
          isReadOnly={false}
        />
      )
    })

    const title = container.querySelector<HTMLInputElement>(
      'input[placeholder="Enter a descriptive title for your study"]'
    )
    const description = container.querySelector<HTMLTextAreaElement>(
      'textarea[placeholder="Brief description of the study (internal use only)"]'
    )

    if (!title || !description) {
      throw new Error('Expected the details fields to render')
    }

    expect(title.dataset.slot).toBe('input')
    expect(title.style.backgroundColor).toBe(
      'var(--style-input-bg, var(--muted))'
    )
    expect(title.classList.contains('h-11')).toBe(true)

    expect(description.dataset.slot).toBe('textarea')
    expect(description.style.backgroundColor).toBe(
      'var(--style-input-bg, var(--muted))'
    )
    expect(description.classList.contains('min-h-16')).toBe(true)

    await act(async () => {
      root.unmount()
    })
  })
})
