'use client'

import type { ReactNode } from 'react'
import { NextIntlClientProvider } from 'next-intl'
import { useStudyMetaStore } from '@/stores/study-meta-store'
import {
  DEFAULT_TIME_ZONE,
  isRTL,
  normalizeLocale,
  type SupportedLocale,
} from './config'
import arMessages from './messages/ar.json'
import deMessages from './messages/de.json'
import enUSMessages from './messages/en-US.json'
import esMessages from './messages/es.json'
import frMessages from './messages/fr.json'
import hiLatnMessages from './messages/hi-Latn.json'
import hiMessages from './messages/hi.json'
import jaMessages from './messages/ja.json'
import ptMessages from './messages/pt.json'
import zhMessages from './messages/zh.json'

const PREVIEW_MESSAGES = {
  'en-US': enUSMessages,
  es: esMessages,
  fr: frMessages,
  de: deMessages,
  pt: ptMessages,
  hi: hiMessages,
  'hi-Latn': hiLatnMessages,
  ja: jaMessages,
  zh: zhMessages,
  ar: arMessages,
} satisfies Record<SupportedLocale, Record<string, unknown>>

interface StudyPreviewTranslationsProviderProps {
  children: ReactNode
}

/**
 * Gives the embedded builder preview the same study-language messages as the
 * participant player without changing the language or direction of the dashboard.
 */
export function StudyPreviewTranslationsProvider({
  children,
}: StudyPreviewTranslationsProviderProps) {
  const language = useStudyMetaStore((state) => state.meta.language)
  const locale = normalizeLocale(language)

  return (
    <NextIntlClientProvider
      locale={locale}
      messages={PREVIEW_MESSAGES[locale]}
      timeZone={DEFAULT_TIME_ZONE}
    >
      <div className="contents" lang={locale} dir={isRTL(locale) ? 'rtl' : 'ltr'}>
        {children}
      </div>
    </NextIntlClientProvider>
  )
}
