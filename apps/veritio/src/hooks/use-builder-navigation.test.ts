import { describe, expect, it } from 'vitest'
import { buildBuilderNavigationURL, buildBuilderURL } from './use-builder-navigation'

describe('builder navigation URLs', () => {
  const pathname = '/projects/project-1/studies/study-1/builder'

  it('changes a tab while preserving unrelated query parameters', () => {
    expect(
      buildBuilderNavigationURL({
        pathname,
        currentSearch: 'source=dashboard&tab=content',
        updates: { tab: 'settings' },
      }),
    ).toBe(`${pathname}?source=dashboard&tab=settings`)
  })

  it('removes default values to keep the URL clean', () => {
    expect(
      buildBuilderNavigationURL({
        pathname,
        currentSearch: 'tab=settings&section=screening&question=question-1',
        updates: {
          tab: 'details',
          section: 'welcome',
          questionId: null,
        },
      }),
    ).toBe(pathname)
  })

  it('supports custom defaults without dropping existing navigation state', () => {
    expect(
      buildBuilderNavigationURL({
        pathname,
        currentSearch: 'section=screening',
        updates: { tab: 'tree', questionId: 'question-2' },
        defaultTab: 'tree',
        defaultSection: 'screening',
      }),
    ).toBe(`${pathname}?section=screening&question=question-2`)
  })

  it('builds a shareable deep link', () => {
    expect(
      buildBuilderURL(pathname, {
        tab: 'study-flow',
        section: 'screening',
        questionId: 'question-3',
      }),
    ).toBe(
      `${pathname}?tab=study-flow&section=screening&question=question-3`,
    )
  })
})
