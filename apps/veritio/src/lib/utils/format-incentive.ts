/**
 * Incentive Display Formatting Utility
 *
 * Formats incentive configuration into display text for participants.
 * Used across email templates, widget, welcome screen, and thank you screen.
 */

import type { Currency, IncentiveType } from '../supabase/panel-types'

export interface IncentiveDisplayConfig {
  enabled: boolean
  amount: number | null
  currency: Currency
  incentive_type: IncentiveType
  description?: string | null
}

const CURRENCY_SYMBOLS: Record<Currency, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  CAD: 'C$',
  AUD: 'A$',
  JPY: '¥',
  CHF: 'CHF ',
  CNY: '¥',
  INR: '₹',
  BRL: 'R$',
}

const INCENTIVE_TYPE_LABELS: Record<IncentiveType, string> = {
  gift_card: 'Gift Card',
  cash: 'Cash',
  credit: 'Credit',
  donation: 'Donation',
  other: 'Reward',
}

/**
 * Format incentive config into display text (e.g., "$90 Gift Card")
 * Returns null if incentive is disabled, amount is 0/null, or config is missing
 */
export function formatIncentiveDisplay(
  config: IncentiveDisplayConfig | null | undefined
): string | null {
  if (!config || !config.enabled || !config.amount || config.amount <= 0) {
    return null
  }

  const symbol = CURRENCY_SYMBOLS[config.currency] || '$'
  const typeLabel = INCENTIVE_TYPE_LABELS[config.incentive_type] || 'Reward'

  // Format amount (no decimals if whole number)
  const formattedAmount =
    config.amount % 1 === 0
      ? config.amount.toString()
      : config.amount.toFixed(2)

  return `${symbol}${formattedAmount} ${typeLabel}`
}

/**
 * Replace {incentive} placeholder in a message with formatted incentive text
 * Falls back to empty string if no incentive configured
 */
export function replaceIncentivePlaceholder(
  message: string,
  config: IncentiveDisplayConfig | null | undefined
): string {
  // Use formatted incentive or fallback to 'a reward' so message still makes sense
  const incentiveText = formatIncentiveDisplay(config) || 'a reward'
  return message.replace(/\{incentive\}/g, incentiveText)
}

/**
 * Check if incentive should be displayed (enabled and has valid amount)
 */
export function shouldShowIncentive(
  config: IncentiveDisplayConfig | null | undefined
): boolean {
  return !!(config && config.enabled && config.amount && config.amount > 0)
}
