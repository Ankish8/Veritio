'use client'

import { ReactNode } from 'react'
import { Button } from '@veritio/ui/components/button'

interface PreviewLayoutProps {
  children: ReactNode
  title?: string
  subtitle?: string
  actions?: ReactNode
  centered?: boolean
}
export function PreviewLayout({
  children,
  title,
  subtitle,
  actions,
  centered = false,
}: PreviewLayoutProps) {
  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-6">
          {/* Content Card */}
          <div
            className={`bg-white rounded-xl border border-stone-200 p-5 ${
              centered ? 'text-center' : ''
            }`}
          >
            {/* Title and Subtitle - kept smaller to emphasize the question */}
            {(title || subtitle) && (
              <div className="mb-4">
                {title && (
                  <h1 className="text-base font-semibold tracking-tight text-stone-900">
                    {title}
                  </h1>
                )}
                {subtitle && (
                  <div
                    className="mt-1 text-xs text-muted-foreground prose prose-sm max-w-none
                      [&_p]:my-0.5 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0
                      [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-1
                      [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-1
                      [&_li]:my-0.5"
                    dangerouslySetInnerHTML={{ __html: subtitle }}
                  />
                )}
              </div>
            )}

            {/* Step Content */}
            {children}
          </div>

          {/* Actions - Directly below the card */}
          {actions && <div className="mt-4">{actions}</div>}
        </div>
      </div>
    </div>
  )
}
interface PreviewButtonProps {
  children: ReactNode
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg'
  className?: string
}

export function PreviewButton({
  children,
  variant = 'default',
  size = 'default',
  className = '',
}: PreviewButtonProps) {
  return (
    <Button
      variant={variant}
      size={size}
      className={`cursor-default ${className}`}
      onClick={(e) => e.preventDefault()}
    >
      {children}
    </Button>
  )
}
