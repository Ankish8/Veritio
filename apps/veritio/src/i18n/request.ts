import { getRequestConfig } from 'next-intl/server'
import { DEFAULT_LOCALE, type SupportedLocale } from './config'

/**
 * next-intl server configuration
 *
 * This is used by next-intl to load the correct translations
 * based on the locale passed from the study player.
 */
export default getRequestConfig(async ({ requestLocale }) => {
  // Get the requested locale (passed from our provider)
  let locale = await requestLocale

  // Validate and fall back to default if needed
  if (!locale) {
    locale = DEFAULT_LOCALE
  }

  try {
    // Dynamically import the translation file
    const messages = (await import(`./messages/${locale}.json`)).default
    return {
      locale,
      messages,
    }
  } catch {
    // Fall back to English if the locale file doesn't exist
    const messages = (await import(`./messages/en-US.json`)).default
    return {
      locale: DEFAULT_LOCALE,
      messages,
    }
  }
})

/**
 * Load translations for a specific locale.
 * Used in server components and page.tsx
 */
export async function loadMessages(locale: SupportedLocale) {
  try {
    return (await import(`./messages/${locale}.json`)).default
  } catch {
    // Fall back to English
    return (await import(`./messages/en-US.json`)).default
  }
}
