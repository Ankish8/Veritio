/**
 * i18n Module
 *
 * Provides internationalization for participant-facing player components.
 * Uses next-intl under the hood.
 *
 * @example Server-side (page.tsx)
 * ```tsx
 * import { loadMessages, normalizeLocale } from '@/i18n'
 *
 * const locale = normalizeLocale(study.language)
 * const messages = await loadMessages(locale)
 * ```
 *
 * @example Client-side provider
 * ```tsx
 * import { StudyTranslationsProvider } from '@/i18n'
 *
 * <StudyTranslationsProvider locale={locale} messages={messages}>
 *   <StudyPlayer />
 * </StudyTranslationsProvider>
 * ```
 *
 * @example Client-side hook
 * ```tsx
 * import { usePlayerTranslations } from '@/i18n/client'
 *
 * const t = usePlayerTranslations()
 * <button>{t('common.continue')}</button>
 * ```
 */

// Configuration
export {
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
  LANGUAGE_OPTIONS,
  RTL_LANGUAGES,
  normalizeLocale,
  isRTL,
  type SupportedLocale,
  type LanguageOption,
} from './config'

// Server-side
export { loadMessages } from './request'

// Client-side
export { StudyTranslationsProvider } from './provider'
