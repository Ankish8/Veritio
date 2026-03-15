'use client'

import { useEffect } from 'react'
import { NextIntlClientProvider } from 'next-intl'
import type { ReactNode } from 'react'
import { isRTL, type SupportedLocale } from './config'

interface StudyTranslationsProviderProps {
  locale: SupportedLocale
  messages: Record<string, unknown>
  children: ReactNode
}

/**
 * Provides translations for participant-facing player components.
 *
 * Language is set at study level (not browser/user level).
 * This provider should wrap the study player at the top level.
 *
 * Also handles RTL (right-to-left) text direction for languages like Arabic.
 *
 * @example
 * ```tsx
 * <StudyTranslationsProvider locale="es" messages={messages}>
 *   <StudyPlayer />
 * </StudyTranslationsProvider>
 * ```
 */
export function StudyTranslationsProvider({
  locale,
  messages,
  children,
}: StudyTranslationsProviderProps) {
  const rtl = isRTL(locale)

  // Set document direction for RTL languages
  useEffect(() => {
    document.documentElement.dir = rtl ? 'rtl' : 'ltr'
    document.documentElement.lang = locale

    // Cleanup on unmount
    return () => {
      document.documentElement.dir = 'ltr'
      document.documentElement.lang = 'en-US'
    }
  }, [rtl, locale])

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  )
}
