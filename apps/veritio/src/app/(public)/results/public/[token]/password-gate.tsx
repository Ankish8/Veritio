'use client'

import { useState, useCallback } from 'react'
import { Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ThemeProvider } from '@/components/study-flow/player/theme-provider'
import { BrandingProvider } from '@/components/study-flow/player/branding-provider'
import type { BrandingSettings } from '@/components/builders/shared/types'
import { verifyPublicResultsPassword } from './actions'

interface PasswordGateProps {
  token: string
  studyTitle?: string
  branding?: Record<string, unknown>
}

export function PasswordGate({ token, studyTitle, branding }: PasswordGateProps) {
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const brandingSettings = (branding || {}) as BrandingSettings
  const logoUrl = brandingSettings.logo?.url
  const logoSize = brandingSettings.logoSize || 48

  const handlePasswordSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!password) return

      setIsSubmitting(true)
      setError(null)

      const result = await verifyPublicResultsPassword(token, password)

      if (result.valid) {
        // Cookie is set by the server action — reload to render results
        window.location.reload()
      } else {
        setError(result.error === 'invalid_password' ? 'Incorrect password. Please try again.' : 'Something went wrong. Please try again.')
        setIsSubmitting(false)
      }
    },
    [token, password]
  )

  return (
    <ThemeProvider themeMode={brandingSettings.themeMode}>
      <BrandingProvider branding={brandingSettings}>
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="w-full max-w-md">
            <div className="bg-card rounded-2xl shadow-sm border p-8 text-center">
              {logoUrl && (
                // eslint-disable-next-line @next/next/no-img-element -- external branding URL
                <img src={logoUrl} alt="Logo" className="mx-auto mb-6 object-contain" style={{ height: logoSize }} />
              )}
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <Lock className="h-8 w-8 text-muted-foreground" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">Password Protected</h1>
              {studyTitle && (
                <p className="mt-2 text-muted-foreground text-sm">Results for: {studyTitle}</p>
              )}
              <p className="mt-4 text-muted-foreground">
                Enter the password to view these results.
              </p>

              {error && (
                <p className="mt-2 text-red-600 text-sm">{error}</p>
              )}

              <form onSubmit={handlePasswordSubmit} className="mt-6 space-y-4">
                <Input
                  id="public-results-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="text-center"
                  autoFocus
                />
                <Button
                  type="submit"
                  disabled={!password || isSubmitting}
                  className="w-full"
                  style={{ backgroundColor: 'var(--brand)', color: 'var(--brand-foreground)' }}
                >
                  {isSubmitting ? 'Checking...' : 'View Results'}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </BrandingProvider>
    </ThemeProvider>
  )
}
