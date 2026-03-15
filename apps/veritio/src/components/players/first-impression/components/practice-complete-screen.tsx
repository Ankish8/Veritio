'use client'

import { CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PracticeCompleteScreenProps {
  onContinue: () => void
}

export function PracticeCompleteScreen({ onContinue }: PracticeCompleteScreenProps) {
  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center p-6"
      style={{ backgroundColor: 'var(--style-page-bg, #ffffff)' }}
    >
      <div className="max-w-md text-center space-y-6">
        {/* Success icon */}
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center mx-auto"
          style={{ backgroundColor: 'var(--brand, #3b82f6)' }}
        >
          <CheckCircle2 className="w-10 h-10 text-white" />
        </div>

        {/* Title */}
        <h2
          className="text-2xl font-bold"
          style={{ color: 'var(--style-text-primary, #000)' }}
        >
          Practice Complete
        </h2>

        {/* Message */}
        <p
          className="text-lg"
          style={{ color: 'var(--style-text-secondary, #666)' }}
        >
          Great! Now you know what to expect. In the real test, your responses will be recorded.
        </p>

        {/* Continue button */}
        <Button
          size="lg"
          onClick={onContinue}
          className="w-full max-w-xs mx-auto"
          style={{
            backgroundColor: 'var(--brand, #3b82f6)',
            color: '#fff',
          }}
        >
          I understand, start the test
        </Button>
      </div>
    </div>
  )
}
