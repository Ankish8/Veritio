/**
 * i18n Configuration
 *
 * This module defines the supported languages and provides utilities
 * for normalizing language codes from the database.
 */

export const SUPPORTED_LOCALES = [
  // English
  'en-US',
  // European languages
  'es',      // Spanish
  'fr',      // French
  'de',      // German
  'pt',      // Portuguese
  // South Asian languages
  'hi',      // Hindi
  'hi-Latn', // Hinglish (Hindi in Latin script)
  // East Asian languages
  'ja',      // Japanese
  'zh',      // Chinese (Simplified)
  // Middle Eastern
  'ar',      // Arabic
] as const

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]

export const DEFAULT_LOCALE: SupportedLocale = 'en-US'

/**
 * RTL (Right-to-Left) languages
 */
export const RTL_LANGUAGES: SupportedLocale[] = ['ar']

/**
 * Check if a locale is RTL
 */
export function isRTL(locale: SupportedLocale): boolean {
  return RTL_LANGUAGES.includes(locale)
}

/**
 * Language metadata for display in the settings dropdown
 */
export interface LanguageOption {
  code: SupportedLocale
  name: string
  nativeName: string
}

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  // English
  { code: 'en-US', name: 'English (US)', nativeName: 'English' },
  // European languages
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  // South Asian languages
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'hi-Latn', name: 'Hinglish', nativeName: 'Hinglish' },
  // East Asian languages
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'zh', name: 'Chinese (Simplified)', nativeName: '简体中文' },
  // Middle Eastern languages
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
]

/**
 * Normalize a language code from the database to a supported locale.
 * Falls back to 'en-US' if the language is not supported.
 */
export function normalizeLocale(dbLanguage: string | null | undefined): SupportedLocale {
  if (!dbLanguage) return DEFAULT_LOCALE

  // Direct match
  if (SUPPORTED_LOCALES.includes(dbLanguage as SupportedLocale)) {
    return dbLanguage as SupportedLocale
  }

  // Try base language (e.g., 'en-US' -> 'en')
  const base = dbLanguage.split('-')[0].toLowerCase()

  // Map common base codes to specific locales (only for languages we have translations for)
  const baseToLocale: Record<string, SupportedLocale> = {
    'en': 'en-US',
    'es': 'es',
    'fr': 'fr',
    'de': 'de',
    'pt': 'pt',
    'hi': 'hi',
    'ja': 'ja',
    'zh': 'zh',
    'ar': 'ar',
  }

  return baseToLocale[base] || DEFAULT_LOCALE
}
