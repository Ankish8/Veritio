import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MultipleChoiceQuestion } from '@/components/study-flow/player/question-renderers/multiple-choice-question'
import { StudyPreviewTranslationsProvider } from './study-preview-translations-provider'

const storeState = vi.hoisted(() => ({
  language: 'en-US',
}))

const intlState = vi.hoisted(() => ({
  messages: {} as Record<string, Record<string, string>>,
}))

vi.mock('@/stores/study-meta-store', () => ({
  useStudyMetaStore: (
    selector: (state: { meta: { language: string } }) => unknown,
  ) => selector({ meta: { language: storeState.language } }),
}))

vi.mock('next-intl', () => ({
  NextIntlClientProvider: ({
    children,
    messages,
  }: {
    children: ReactNode
    messages: Record<string, Record<string, string>>
  }) => {
    intlState.messages = messages
    return children
  },
  useTranslations: (namespace: string) => (key: string) =>
    intlState.messages[namespace]?.[key] ?? key,
}))

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: { children: ReactNode }) => children,
  SelectContent: ({ children }: { children: ReactNode }) => children,
  SelectItem: ({ children }: { children: ReactNode }) => children,
  SelectTrigger: ({ children }: { children: ReactNode }) => children,
  SelectValue: ({ placeholder }: { placeholder?: ReactNode }) => placeholder,
}))

function renderQuestion(): string {
  return renderToStaticMarkup(
    <StudyPreviewTranslationsProvider>
      <MultipleChoiceQuestion
        config={{ mode: 'dropdown', options: [] }}
        value={undefined}
        onChange={vi.fn()}
      />
    </StudyPreviewTranslationsProvider>,
  )
}

describe('StudyPreviewTranslationsProvider', () => {
  beforeEach(() => {
    storeState.language = 'en-US'
  })

  it('provides participant question messages inside the builder preview', () => {
    const markup = renderQuestion()

    expect(markup).toContain('Select an option...')
    expect(markup).toContain('lang="en-US"')
    expect(markup).toContain('dir="ltr"')
  })

  it('uses the study locale and scopes RTL direction to the preview', () => {
    storeState.language = 'ar'

    const markup = renderQuestion()

    expect(markup).toContain('اختر خياراً...')
    expect(markup).toContain('lang="ar"')
    expect(markup).toContain('dir="rtl"')
  })
})
