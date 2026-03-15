/**
 * Auto-translation for user-provided content using DeepL API
 *
 * Translates study content (title, description, messages) from English
 * to the selected language using DeepL (best-in-class translation quality).
 *
 * Features:
 * - In-memory caching to minimize API calls
 * - Free tier: 500,000 characters/month
 * - Superior translation quality vs Google/LibreTranslate
 * - HTML content preservation
 *
 * Setup:
 * 1. Sign up at https://www.deepl.com/pro-api (free tier)
 * 2. Get your API key
 * 3. Add to .env.local: DEEPL_API_KEY=your_key_here
 */

import type { SupportedLocale } from '../../i18n/config'

// In-memory cache for translations
const translationCache = new Map<string, string>()

// DeepL API configuration
const DEEPL_API_KEY = process.env.DEEPL_API_KEY
const DEEPL_API_URL = DEEPL_API_KEY?.startsWith('DeepL-Auth-Key')
  ? 'https://api.deepl.com/v2/translate'  // Paid plan
  : 'https://api-free.deepl.com/v2/translate'  // Free plan

// Language code mapping (our codes → DeepL codes)
const LOCALE_TO_DEEPL: Record<SupportedLocale, string> = {
  'en-US': 'EN-US',
  'es': 'ES',
  'fr': 'FR',
  'de': 'DE',
  'pt': 'PT-PT',  // European Portuguese (use PT-BR for Brazilian)
  'hi': 'HI',
  'hi-Latn': 'EN-US', // Hinglish → no direct support, keep English
  'ja': 'JA',
  'zh': 'ZH',  // Simplified Chinese
  'ar': 'AR',
}

/**
 * Generate cache key for a translation
 */
function getCacheKey(text: string, targetLocale: SupportedLocale): string {
  // Create unique key based on text content and target language
  return `${targetLocale}:${text.substring(0, 150)}`
}

/**
 * Translate text using DeepL API
 */
async function translateWithDeepL(
  text: string,
  targetLang: string,
  preserveFormatting: boolean = false
): Promise<string> {
  if (!DEEPL_API_KEY) {
    return text // Return original text if no API key
  }

  try {
    const formData = new URLSearchParams({
      text,
      target_lang: targetLang,
      source_lang: 'EN',
      formality: 'default',
      preserve_formatting: preserveFormatting ? '1' : '0',
      tag_handling: preserveFormatting ? 'html' : '',
    })

    const response = await fetch(DEEPL_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `DeepL-Auth-Key ${DEEPL_API_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[DeepL] API error:', response.status, errorText)
      return text
    }

    const data = await response.json()

    if (!data.translations || data.translations.length === 0) {
      console.error('[DeepL] No translations returned')
      return text
    }

    return data.translations[0].text || text
  } catch (error) {
    console.error('[DeepL] Translation failed:', error)
    return text
  }
}

/**
 * Auto-translate plain text to target locale with caching
 *
 * @param text - Original text in English
 * @param targetLocale - Target language code
 * @returns Translated text (or original if translation fails or locale is English)
 *
 * @example
 * ```ts
 * const translated = await autoTranslate("Welcome to our study", "hi")
 * // Returns: "हमारे अध्ययन में आपका स्वागत है"
 * ```
 */
export async function autoTranslate(
  text: string | null | undefined,
  targetLocale: SupportedLocale
): Promise<string> {
  // Return empty string for null/undefined
  if (!text || text.trim() === '') return ''

  // No translation needed for English
  if (targetLocale === 'en-US') return text

  // Special handling for languages not supported by DeepL Free
  // Hinglish - keep English (no auto-translation)
  // Hindi - keep English (DeepL Free doesn't support Hindi, only paid tier)
  if (targetLocale === 'hi-Latn' || targetLocale === 'hi') {
    return text
  }

  // Check cache first
  const cacheKey = getCacheKey(text, targetLocale)
  const cached = translationCache.get(cacheKey)
  if (cached) return cached

  // Translate via DeepL
  const targetLang = LOCALE_TO_DEEPL[targetLocale]
  const translated = await translateWithDeepL(text, targetLang, false)

  // Cache result (even if translation failed, cache the fallback to avoid repeated API calls)
  translationCache.set(cacheKey, translated)

  return translated
}

/**
 * Auto-translate HTML content (preserves HTML tags and formatting)
 *
 * @param html - Original HTML in English
 * @param targetLocale - Target language code
 * @returns Translated HTML (or original if translation fails)
 *
 * @example
 * ```ts
 * const html = "<p>Welcome to <strong>our study</strong></p>"
 * const translated = await autoTranslateHTML(html, "hi")
 * // Returns: "<p>हमारे <strong>अध्ययन</strong> में आपका स्वागत है</p>"
 * ```
 */
export async function autoTranslateHTML(
  html: string | null | undefined,
  targetLocale: SupportedLocale
): Promise<string> {
  if (!html || html.trim() === '') return ''
  if (targetLocale === 'en-US' || targetLocale === 'hi-Latn' || targetLocale === 'hi') return html

  // Check cache
  const cacheKey = getCacheKey(html, targetLocale)
  const cached = translationCache.get(cacheKey)
  if (cached) return cached

  // Translate with HTML preservation
  const targetLang = LOCALE_TO_DEEPL[targetLocale]
  const translated = await translateWithDeepL(html, targetLang, true)

  // Cache result
  translationCache.set(cacheKey, translated)

  return translated
}

/**
 * Clear the translation cache (useful for testing or memory management)
 */
export function clearTranslationCache(): void {
  translationCache.clear()
}

/**
 * Get translation cache statistics
 */
export function getTranslationCacheStats() {
  return {
    size: translationCache.size,
    keys: Array.from(translationCache.keys()).slice(0, 10), // First 10 keys for debugging
  }
}
