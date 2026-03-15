'use client'

import { Button } from '@/components/ui/button'
import { Eye } from 'lucide-react'

interface GetReadyScreenProps {
  designNumber: number
  totalDesigns: number
  durationSeconds: number
  isPractice: boolean
  onReady: () => void
}

export function GetReadyScreen({
  designNumber,
  totalDesigns,
  durationSeconds,
  isPractice,
  onReady,
}: GetReadyScreenProps) {
  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center p-6"
      style={{ backgroundColor: 'var(--style-page-bg, #ffffff)' }}
    >
      <div className="max-w-md text-center space-y-6">
        {/* Icon */}
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center mx-auto"
          style={{ backgroundColor: 'var(--brand, #3b82f6)' }}
        >
          <Eye className="w-10 h-10 text-white" />
        </div>

        {/* Title */}
        <h2
          className="text-2xl font-bold"
          style={{ color: 'var(--style-text-primary, #000)' }}
        >
          {isPractice ? 'Practice Round' : `Design ${designNumber} of ${totalDesigns}`}
        </h2>

        {/* Instructions */}
        <p
          className="text-lg"
          style={{ color: 'var(--style-text-secondary, #666)' }}
        >
          You'll see a design for <strong>{durationSeconds} seconds</strong>.
          {isPractice
            ? " This is a practice round to help you understand the task."
            : " Pay attention to your first impression."}
        </p>

        {/* Additional tips */}
        <ul
          className="text-sm text-left space-y-2 mx-auto max-w-sm"
          style={{ color: 'var(--style-text-secondary, #666)' }}
        >
          <li className="flex items-start gap-2">
            <span className="text-lg">👁️</span>
            <span>Look at the design naturally - don't try to memorize details</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-lg">💭</span>
            <span>Note your immediate thoughts and feelings</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-lg">📝</span>
            <span>You'll answer questions about your impressions afterward</span>
          </li>
        </ul>

        {/* Ready button */}
        <Button
          size="lg"
          onClick={onReady}
          className="w-full max-w-xs mx-auto"
          style={{
            backgroundColor: 'var(--brand, #3b82f6)',
            color: '#fff',
          }}
        >
          I'm Ready
        </Button>

        {isPractice && (
          <p
            className="text-xs"
            style={{ color: 'var(--style-text-secondary, #999)' }}
          >
            Practice responses won't be included in the final results
          </p>
        )}
      </div>
    </div>
  )
}
