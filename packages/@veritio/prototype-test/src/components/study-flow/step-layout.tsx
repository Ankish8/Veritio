'use client'

import { ReactNode } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@veritio/ui'
import { useBranding } from '../../stores/study-flow-player'
import { LOGO_SIZE_DEFAULT } from '../../builder/shared/types'
import type { BrandingSettings } from '../../builder/shared/types'

interface StepLayoutProps {
  children: ReactNode
  title?: string
  subtitle?: string
  actions?: ReactNode
  showBackButton?: boolean
  onBack?: () => void
  centered?: boolean // For completion screens (thank-you, rejection)
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl'
}
export function StepLayout({
  children,
  title,
  subtitle,
  actions,
  showBackButton,
  onBack,
  centered = false,
  maxWidth = '3xl',
}: StepLayoutProps) {
  const branding = useBranding() as BrandingSettings | null

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Logo Header - shown if branding has logo */}
      {branding?.logo?.url && (
        <div className="px-6 pt-6 pb-2">
          <div className={`mx-auto flex justify-center ${maxWidthClasses[maxWidth]}`}>
            <img
              src={branding.logo.url}
              alt="Study logo"
              className="max-w-[200px] object-contain"
              style={{ height: branding.logoSize || LOGO_SIZE_DEFAULT }}
            />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto">
        <div className={`mx-auto px-6 ${branding?.logo?.url ? 'pt-4 pb-8' : 'py-8'} ${maxWidthClasses[maxWidth]}`}>
          {/* Back Button */}
          {showBackButton && onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-sm mb-6 transition-colors"
              style={{
                color: 'var(--style-text-secondary)',
              }}
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
          )}

          {/* Content Card - Uses CSS variables from BrandingProvider */}
          <div
            className={`p-6 md:p-8 ${centered ? 'text-center' : ''}`}
            style={{
              backgroundColor: 'var(--style-card-bg)',
              border: '1px solid var(--style-card-border)',
              borderRadius: 'var(--style-radius)',
              boxShadow: 'var(--style-shadow)',
            }}
          >
            {/* Title and Subtitle - kept smaller to emphasize the question */}
            {(title || subtitle) && (
              <div className={`mb-6 ${centered ? '' : ''}`}>
                {title && (
                  <h1
                    className="text-xl font-semibold tracking-tight"
                    style={{ color: 'var(--style-text-primary)' }}
                  >
                    {title}
                  </h1>
                )}
                {subtitle && (
                  <p
                    className="mt-1 text-sm"
                    style={{ color: 'var(--style-text-secondary)' }}
                  >
                    {subtitle}
                  </p>
                )}
              </div>
            )}

            {/* Step Content */}
            {children}
          </div>

          {/* Actions - Directly below the card */}
          {actions && (
            <div className="mt-6">{actions}</div>
          )}
        </div>
      </div>
    </div>
  )
}
interface BrandedButtonProps {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  type?: 'button' | 'submit'
  size?: 'default' | 'sm' | 'lg'
  variant?: 'default' | 'outline' | 'ghost'
  className?: string
}

export function BrandedButton({
  children,
  onClick,
  disabled,
  type = 'button',
  size = 'lg',
  variant = 'default',
  className = '',
}: BrandedButtonProps) {
  // Use CSS variables directly for brand styling (set by app-level BrandingProvider)
  const isBranded = variant === 'default' && !disabled

  return (
    <Button
      type={type}
      variant={variant}
      onClick={onClick}
      disabled={disabled}
      size={size}
      className={`${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      style={{
        borderRadius: 'var(--style-button-radius)',
        ...(isBranded ? {
          backgroundColor: 'var(--brand)',
          color: 'var(--brand-foreground)',
          borderColor: 'var(--brand)',
        } : {}),
      }}
    >
      {children}
    </Button>
  )
}
export function useButtonText(type: 'continue' | 'finished'): string {
  const branding = useBranding() as BrandingSettings | null
  const defaultText = type === 'continue' ? 'Continue' : 'Finished'
  return branding?.buttonText?.[type] || defaultText
}
