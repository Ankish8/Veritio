'use client'

import type { ReactNode } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useBranding } from '@/stores/study-flow-player'
import { useBrandingContext } from './branding-provider'
import { LOGO_SIZE_DEFAULT } from '@/components/builders/shared/types'

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
  const branding = useBranding()

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
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto">
        <div className={`mx-auto px-6 ${branding?.logo?.url ? 'pt-4 pb-8' : 'py-8'} ${maxWidthClasses[maxWidth]}`}>
          {/* Back Button */}
          {showBackButton && onBack && (
            <button
              onClick={onBack}
              className="hidden md:flex items-center gap-2 text-sm mb-6 transition-colors"
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
            className={`p-6 md:p-10 ${centered ? 'text-center' : ''}`}
            style={{
              backgroundColor: 'var(--style-card-bg)',
              border: '1px solid var(--style-card-border)',
              borderRadius: 'var(--style-radius)',
              boxShadow: 'var(--style-shadow), 0 1px 3px 0 rgba(0, 0, 0, 0.02)',
            }}
          >
            {/* Title and Subtitle - kept smaller to emphasize the question */}
            {(title || subtitle) && (
              <div className="mb-8">
                {title && (
                  <h1
                    className="text-2xl md:text-3xl font-semibold tracking-tight leading-tight"
                    style={{ color: 'var(--style-text-primary)' }}
                  >
                    {title}
                  </h1>
                )}
                {subtitle && (
                  <div
                    className="mt-3 text-sm max-w-none
                      [&_p]:my-0.5 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0
                      [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-1
                      [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-1
                      [&_li]:my-0.5"
                    style={{ color: 'var(--style-text-secondary)' }}
                    dangerouslySetInnerHTML={{ __html: subtitle }}
                  />
                )}
              </div>
            )}

            {/* Step Content */}
            {children}
          </div>

          {/* Actions - below the card */}
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
  const { isActive } = useBrandingContext()

  // Use CSS variables for brand colors when active, otherwise use default button styling
  const brandedClasses = isActive && variant === 'default' && !disabled
    ? 'bg-brand hover:bg-brand-hover text-brand-foreground border-brand'
    : ''

  return (
    <Button
      type={type}
      variant={variant}
      onClick={onClick}
      disabled={disabled}
      size={size}
      className={`${brandedClasses} ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      style={{ borderRadius: 'var(--style-button-radius)' }}
    >
      {children}
    </Button>
  )
}

export function useButtonText(type: 'continue' | 'finished'): string {
  const branding = useBranding()
  const defaultText = type === 'continue' ? 'Continue' : 'Finished'
  return branding?.buttonText?.[type] || defaultText
}
