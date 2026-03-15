'use client'

import { MousePointerClick } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { TaskHeaderProps } from '../types'

export function TaskHeader({
  taskNumber,
  totalTasks,
  question,
  progress,
  allowSkip,
  onSkip,
}: TaskHeaderProps) {
  const t = useTranslations()
  return (
    <div
      style={{
        backgroundColor: 'var(--style-card-bg)',
        borderBottom: '1px solid var(--style-card-border)',
      }}
    >
      <div className="max-w-3xl mx-auto px-6 py-5">
        {/* Task number and skip link row */}
        <div className="flex items-center justify-between gap-4 mb-3">
          <span
            className="text-sm font-medium uppercase tracking-wide"
            style={{ color: 'var(--style-text-secondary)' }}
          >
            {t('treeTest.taskProgress', { current: taskNumber, total: totalTasks })}
          </span>
          {allowSkip && (
            <button
              onClick={onSkip}
              className="text-sm hover:underline transition-colors shrink-0"
              style={{ color: 'var(--style-text-secondary)' }}
            >
              {t('common.skipTask')}
            </button>
          )}
        </div>

        {/* Task question - prominent display */}
        <h1
          className="text-xl font-semibold mb-3 leading-snug"
          style={{ color: 'var(--style-text-primary)' }}
        >
          {question}
        </h1>

        {/* Navigation instruction */}
        <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--style-text-secondary)' }}>
          <MousePointerClick className="h-4 w-4" />
          <span>{t('treeTest.instruction')}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div
        className="h-1 w-full overflow-hidden"
        style={{ backgroundColor: 'var(--brand-muted)' }}
      >
        <div
          className="h-full transition-all"
          style={{
            width: `${progress}%`,
            backgroundColor: 'var(--brand)',
          }}
        />
      </div>
    </div>
  )
}
