'use client'

import { memo, useState, useCallback } from 'react'
import { Lock, Eye, EyeOff, Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { LOGO_SIZE_DEFAULT } from '@/components/builders/shared/types'
import type { BrandingSettings } from '@/components/builders/shared/types'

export interface PasswordRequiredStateProps {
  title: string
  branding?: BrandingSettings | null
  onSubmit: (password: string) => void
  isSubmitting: boolean
  error?: string | null
}

export const PasswordRequiredState = memo(function PasswordRequiredState({
  title,
  branding,
  onSubmit,
  isSubmitting,
  error,
}: PasswordRequiredStateProps) {
  const t = useTranslations()
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const primaryColor = branding?.primaryColor || 'var(--brand, #18181b)'

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      if (!password.trim()) return
      onSubmit(password)
    },
    [password, onSubmit]
  )

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: 'var(--style-page-bg, #fafaf9)' }}
    >
      <div
        className="max-w-md w-full rounded-2xl shadow-lg p-8"
        style={{ backgroundColor: 'var(--style-card-bg, white)' }}
      >
        {branding?.logo?.url && (
          <div className="flex justify-center mb-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={branding.logo.url}
              alt="Study logo"
              width={200}
              height={branding.logoSize || LOGO_SIZE_DEFAULT}
              className="max-w-[200px] object-contain"
              style={{ height: branding.logoSize || LOGO_SIZE_DEFAULT }}
            />
          </div>
        )}
        <div className="text-center mb-6">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: 'var(--style-bg-muted, #f5f5f4)' }}
          >
            <Lock className="h-8 w-8" style={{ color: 'var(--style-text-muted, #78716c)' }} />
          </div>
          <h1 className="text-xl font-semibold mb-2">{title}</h1>
          <p className="text-muted-foreground">
            {t('password.subtitle')}
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="study-password">{t('password.title')}</Label>
            <div className="relative">
              <Input
                id="study-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('password.placeholder')}
                className={`pr-10 ${error ? 'border-red-500' : ''}`}
                autoFocus
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {error && <p className="text-sm text-red-500">{error.startsWith('password.') ? t(error as any) : error}</p>}
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting}
            style={{ backgroundColor: primaryColor }}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('password.verifying')}
              </>
            ) : (
              t('common.continue')
            )}
          </Button>
        </form>
      </div>
    </div>
  )
})
