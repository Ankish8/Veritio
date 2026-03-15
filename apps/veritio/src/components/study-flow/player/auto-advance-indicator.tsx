'use client'

import { X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'

interface AutoAdvanceIndicatorProps {
  isAdvancing: boolean
  remainingMs: number
  totalMs?: number
  onCancel: () => void
}

export function AutoAdvanceIndicator({
  isAdvancing,
  remainingMs,
  totalMs = 300,
  onCancel,
}: AutoAdvanceIndicatorProps) {
  const t = useTranslations()
  if (!isAdvancing) return null

  const progress = ((totalMs - remainingMs) / totalMs) * 100
  const circumference = 2 * Math.PI * 10 // radius = 10
  const strokeDashoffset = circumference - (progress / 100) * circumference

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
      <div className="flex items-center gap-3 bg-zinc-900 text-white px-4 py-2.5 rounded-full shadow-lg">
        {/* Circular progress */}
        <svg className="w-6 h-6 -rotate-90" viewBox="0 0 24 24">
          {/* Background circle */}
          <circle
            cx="12"
            cy="12"
            r="10"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-zinc-700"
          />
          {/* Progress circle */}
          <circle
            cx="12"
            cy="12"
            r="10"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            className="text-white transition-all duration-50"
            style={{
              strokeDasharray: circumference,
              strokeDashoffset,
            }}
          />
        </svg>

        <span className="text-sm font-medium">{t('autoAdvance.advancing')}</span>

        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="h-6 w-6 p-0 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">{t('autoAdvance.cancel')}</span>
        </Button>
      </div>
    </div>
  )
}
