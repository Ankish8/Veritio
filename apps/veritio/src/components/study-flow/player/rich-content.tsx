'use client'

import DOMPurify from 'dompurify'
import { cn } from '@veritio/ui/utils'

const RICH_CONTENT_CLASSES = `max-w-none text-base leading-relaxed
  [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-4
  [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-4
  [&_li]:my-1 [&_p]:leading-relaxed [&_p]:my-2
  [&_strong]:font-semibold [&_em]:italic
  [&_a]:underline [&_a]:underline-offset-2`

interface RichContentProps {
  html: string
  className?: string
  textColor?: string
}

export function RichContent({ html, className, textColor = 'var(--style-text-secondary)' }: RichContentProps) {
  return (
    <div
      className={cn(RICH_CONTENT_CLASSES, className)}
      style={{ color: textColor }}
      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }}
    />
  )
}
