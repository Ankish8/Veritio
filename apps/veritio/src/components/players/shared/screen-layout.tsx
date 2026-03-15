'use client'

import { type ReactNode } from 'react'
import { Check, AlertTriangle, Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'

export interface ScreenLayoutProps {
  children: ReactNode
  maxWidth?: string
}

export function ScreenLayout({ children, maxWidth = 'max-w-md' }: ScreenLayoutProps) {
  return (
    <div
      className="flex-1 flex flex-col min-h-0"
      style={{ backgroundColor: 'var(--style-page-bg)' }}
    >
      <div className="flex-1 flex items-center justify-center">
        <div className={cn('mx-auto px-6 py-8 w-full', maxWidth)}>
          {children}
        </div>
      </div>
    </div>
  )
}

export interface ScreenCardProps {
  children: ReactNode
  className?: string
}

export function ScreenCard({ children, className }: ScreenCardProps) {
  return (
    <div
      className={cn('p-8 text-center', className)}
      style={{
        backgroundColor: 'var(--style-card-bg)',
        borderRadius: 'var(--style-radius-lg)',
        border: '1px solid var(--style-card-border)',
        boxShadow: 'var(--style-shadow)',
      }}
    >
      {children}
    </div>
  )
}

export type ScreenIconVariant = 'success' | 'error' | 'loading' | 'warning' | 'info'

export interface ScreenIconProps {
  variant: ScreenIconVariant
  icon?: ReactNode
}

const iconVariantStyles: Record<ScreenIconVariant, { bg: string; color: string }> = {
  success: { bg: 'var(--brand-light, #dcfce7)', color: 'var(--brand, #16a34a)' },
  error: { bg: 'var(--style-bg-muted)', color: 'var(--destructive, #ef4444)' },
  warning: { bg: 'var(--warning-bg, #fef3c7)', color: 'var(--warning-color, #d97706)' },
  info: { bg: 'var(--brand-light, #dbeafe)', color: 'var(--brand, #3b82f6)' },
  loading: { bg: 'var(--style-bg-muted)', color: 'var(--style-text-secondary)' },
}

const defaultIcons: Record<ScreenIconVariant, ReactNode> = {
  success: <Check className="h-8 w-8" />,
  error: <AlertTriangle className="h-8 w-8" />,
  warning: <AlertTriangle className="h-8 w-8" />,
  info: <Check className="h-8 w-8" />,
  loading: <Loader2 className="h-8 w-8 animate-spin" />,
}

export function ScreenIcon({ variant, icon }: ScreenIconProps) {
  const styles = iconVariantStyles[variant]
  const displayIcon = icon ?? defaultIcons[variant]

  return (
    <div
      className="w-16 h-16 flex items-center justify-center mx-auto mb-4"
      style={{
        borderRadius: 'var(--style-radius-xl)',
        backgroundColor: styles.bg,
        color: styles.color,
      }}
    >
      {displayIcon}
    </div>
  )
}

export interface ScreenTitleProps {
  children: ReactNode
}

export function ScreenTitle({ children }: ScreenTitleProps) {
  return (
    <h1
      className="text-2xl font-bold mb-4"
      style={{ color: 'var(--style-text-primary)' }}
    >
      {children}
    </h1>
  )
}

export interface ScreenMessageProps {
  children: ReactNode
  preserveWhitespace?: boolean
  className?: string
}

export function ScreenMessage({ children, preserveWhitespace, className }: ScreenMessageProps) {
  return (
    <p
      className={cn(preserveWhitespace && 'whitespace-pre-wrap', className)}
      style={{ color: 'var(--style-text-secondary)' }}
    >
      {children}
    </p>
  )
}

export interface StatusScreenProps {
  variant: ScreenIconVariant
  title: string
  message: string
  icon?: ReactNode
  actions?: ReactNode
}

export function StatusScreen({ variant, title, message, icon, actions }: StatusScreenProps) {
  return (
    <ScreenLayout>
      <ScreenCard>
        <ScreenIcon variant={variant} icon={icon} />
        <ScreenTitle>{title}</ScreenTitle>
        <ScreenMessage preserveWhitespace>{message}</ScreenMessage>
        {actions && <div className="mt-6">{actions}</div>}
      </ScreenCard>
    </ScreenLayout>
  )
}

export interface CompleteScreenBaseProps {
  message?: string
}

export function CompleteScreenBase({ message }: CompleteScreenBaseProps) {
  const t = useTranslations()
  return (
    <StatusScreen
      variant="success"
      title={t('thankYou.title')}
      message={message || t('thankYou.defaultMessage')}
    />
  )
}

export interface ErrorScreenBaseProps {
  message: string
  onRetry?: () => void
  retryLabel?: string
}

export function ErrorScreenBase({ message, onRetry, retryLabel }: ErrorScreenBaseProps) {
  const t = useTranslations()
  return (
    <StatusScreen
      variant="error"
      title={t('error.title')}
      message={message}
      actions={
        onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 rounded-lg border transition-colors"
            style={{
              borderColor: 'var(--style-card-border)',
              color: 'var(--style-text-primary)',
              borderRadius: 'var(--style-radius)',
            }}
          >
            {retryLabel || t('common.tryAgain')}
          </button>
        )
      }
    />
  )
}

export interface SubmittingScreenBaseProps {
  message?: string
}

export function SubmittingScreenBase({ message }: SubmittingScreenBaseProps) {
  const t = useTranslations()
  return (
    <StatusScreen
      variant="loading"
      title={t('submitting.title')}
      message={message || t('submitting.message')}
    />
  )
}
