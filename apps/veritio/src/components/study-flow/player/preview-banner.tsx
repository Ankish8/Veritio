'use client'

import { Eye, X } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface PreviewBannerProps {
  exitUrl?: string
  message?: string
}

export function PreviewBanner({
  exitUrl,
  message = 'This is a study preview. No data will be saved.',
}: PreviewBannerProps) {
  return (
    <div className="sticky top-0 z-50 bg-amber-50 border-b border-amber-200 px-4 py-2.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2 text-amber-800">
          <Eye className="h-4 w-4 flex-shrink-0" />
          <span className="text-sm font-medium">{message}</span>
        </div>

        {exitUrl && (
          <Button
            variant="ghost"
            size="sm"
            className="text-amber-800 hover:text-amber-900 hover:bg-amber-100"
            asChild
          >
            <Link href={exitUrl}>
              <X className="h-4 w-4 mr-1" />
              Exit Preview
            </Link>
          </Button>
        )}
      </div>
    </div>
  )
}
