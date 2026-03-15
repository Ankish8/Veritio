'use client'

import { useTranslations } from 'next-intl'

/**
 * Hook for accessing translations in player components.
 *
 * Provides type-safe access to translation keys with interpolation support.
 *
 * @example
 * ```tsx
 * const t = usePlayerTranslations()
 *
 * // Simple translation
 * <button>{t('common.continue')}</button>
 *
 * // With interpolation
 * <p>{t('cardSort.cardsRemaining', { remaining: 5, total: 20 })}</p>
 * ```
 */
export function usePlayerTranslations() {
  return useTranslations()
}

/**
 * Hook for accessing a specific namespace of translations.
 *
 * @example
 * ```tsx
 * const t = usePlayerSection('cardSort')
 * <p>{t('allDone', { buttonText: 'Finish' })}</p>
 * ```
 */
export function usePlayerSection(namespace: string) {
  return useTranslations(namespace)
}

// Re-export next-intl hooks for flexibility
export { useTranslations, useLocale } from 'next-intl'
