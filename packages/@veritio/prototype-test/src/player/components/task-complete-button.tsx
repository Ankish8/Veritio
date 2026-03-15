'use client'

import { CheckCircle } from 'lucide-react'
import { BrandedButton } from '../../components/study-flow/step-layout'

interface TaskCompleteButtonProps {
  onClick: () => void
  disabled?: boolean
  label?: string
}
export function TaskCompleteButton({
  onClick,
  disabled = false,
  label = "I've completed this task",
}: TaskCompleteButtonProps) {
  return (
    <div
      className="px-6 py-4"
      style={{
        backgroundColor: 'var(--style-card-bg)',
        borderTop: '1px solid var(--style-card-border)',
      }}
    >
      <div className="max-w-4xl mx-auto flex justify-end">
        <BrandedButton
          onClick={onClick}
          disabled={disabled}
          size="lg"
          className="gap-2"
        >
          <CheckCircle className="h-5 w-5" />
          {label}
        </BrandedButton>
      </div>
    </div>
  )
}
