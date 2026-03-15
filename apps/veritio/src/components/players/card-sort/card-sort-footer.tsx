'use client'

import { Check, AlertCircle } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface CardSortFooterProps {
  /** Number of cards remaining to sort */
  remainingCards: number
  /** Total number of cards */
  totalCards: number
  /** Text for the finished button (shown in message) */
  finishedButtonText: string
  /** Whether to show the progress footer */
  showProgress?: boolean
  /** Number of categories that need naming (for "group first, name later" UX) */
  unnamedCategoriesCount?: number
}

export function CardSortFooter({
  remainingCards,
  totalCards,
  finishedButtonText,
  showProgress = true,
  unnamedCategoriesCount = 0,
}: CardSortFooterProps) {
  const t = useTranslations()

  // Don't render footer if progress is hidden
  if (!showProgress) {
    return null
  }

  const isComplete = remainingCards === 0
  const hasUnnamedCategories = unnamedCategoriesCount > 0
  const progressPercent = ((totalCards - remainingCards) / totalCards) * 100

  // Determine the status message
  const renderStatusMessage = () => {
    if (!isComplete) {
      // Still sorting cards
      return (
        <p className="text-sm font-medium" style={{ color: 'var(--style-text-primary)' }}>
          {t('cardSort.cardsRemaining', { remaining: remainingCards, total: totalCards })}
        </p>
      )
    }

    if (hasUnnamedCategories) {
      // All cards sorted but need to name groups
      return (
        <p className="text-sm font-medium" style={{ color: 'var(--warning-color, #f97316)' }}>
          <AlertCircle className="h-4 w-4 inline mr-1" />
          {unnamedCategoriesCount === 1
            ? 'Name your group before finishing'
            : `Name your ${unnamedCategoriesCount} groups before finishing`}
        </p>
      )
    }

    // All done!
    return (
      <p className="text-sm font-medium" style={{ color: 'var(--brand)' }}>
        <Check className="h-4 w-4 inline mr-1" />
        {t('cardSort.allDone', { buttonText: finishedButtonText })}
      </p>
    )
  }

  return (
    <div
      className="p-3 sticky bottom-0"
      style={{
        backgroundColor: 'var(--style-footer-bg, var(--style-card-bg))',
        borderTop: '1px solid var(--style-card-border)',
      }}
    >
      <div className="px-2 flex items-center gap-4">
        <div className="flex-1">
          {renderStatusMessage()}
        </div>
        <div
          className="h-1.5 flex-1 rounded-full overflow-hidden max-w-xs"
          style={{ backgroundColor: 'var(--brand-muted)' }}
        >
          <div
            className="h-full transition-all duration-300"
            style={{
              width: `${progressPercent}%`,
              backgroundColor: 'var(--brand)',
            }}
          />
        </div>
      </div>
    </div>
  )
}
