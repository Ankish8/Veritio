'use client'

import { Loader2 } from 'lucide-react'

export function SubmittingScreen() {
  return (
    <div
      className="flex-1 flex flex-col min-h-0"
      style={{ backgroundColor: 'var(--style-page-bg)' }}
    >
      <div className="flex-1 flex items-center justify-center">
        <div className="mx-auto px-6 py-8 max-w-md w-full">
          <div
            className="p-8 text-center"
            style={{
              backgroundColor: 'var(--style-card-bg)',
              borderRadius: 'var(--style-radius-lg)',
              border: '1px solid var(--style-card-border)',
              boxShadow: 'var(--style-shadow)',
            }}
          >
            <Loader2
              className="h-12 w-12 animate-spin mx-auto mb-4"
              style={{ color: 'var(--brand)' }}
            />
            <h1
              className="text-xl font-semibold"
              style={{ color: 'var(--style-text-primary)' }}
            >
              Submitting your response...
            </h1>
          </div>
        </div>
      </div>
    </div>
  )
}
