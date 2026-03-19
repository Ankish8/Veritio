'use client'

import * as React from 'react'
import { Check, Copy } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export interface CopyButtonProps extends Omit<React.ComponentProps<typeof Button>, 'onClick'> {
  text: string
  label?: string
}

function CopyButton({ text, label, className, variant = 'ghost', size = 'xs', children, ...props }: CopyButtonProps) {
  const [copied, setCopied] = React.useState(false)

  function handleCopy(): void {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Button
      variant={variant}
      size={size}
      className={cn('gap-1.5', className)}
      onClick={handleCopy}
      {...props}
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      {label && <span>{copied ? 'Copied!' : label}</span>}
      {children}
    </Button>
  )
}

export { CopyButton }
