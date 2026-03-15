'use client'

import { useState } from 'react'
import { Copy, Check, ExternalLink } from 'lucide-react'

import { Button } from '@/components/ui/button'

interface ShareLinkProps {
  shareCode: string | undefined | null
  className?: string
}

export function ShareLink({ shareCode, className }: ShareLinkProps) {
  const [copied, setCopied] = useState(false)

  // Handle missing share code gracefully
  if (!shareCode) {
    return (
      <div className={className}>
        <h3 className="font-semibold mb-2">Share Link</h3>
        <div className="text-sm text-muted-foreground">
          Share link not available. Please try refreshing or contact support.
        </div>
      </div>
    )
  }

  const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/s/${shareCode}`

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <div className={className}>
      <h3 className="font-semibold mb-2">Share Link</h3>
      <div className="flex items-center gap-2">
        <code className="flex-1 rounded bg-muted px-3 py-2 text-sm truncate">
          {shareUrl}
        </code>
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopy}
          className="shrink-0"
        >
          {copied ? (
            <>
              <Check className="mr-2 h-4 w-4 text-green-600" />
              Copied
            </>
          ) : (
            <>
              <Copy className="mr-2 h-4 w-4" />
              Copy
            </>
          )}
        </Button>
        <Button variant="outline" size="sm" asChild className="shrink-0">
          <a href={shareUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="mr-2 h-4 w-4" />
            Open
          </a>
        </Button>
      </div>
    </div>
  )
}
