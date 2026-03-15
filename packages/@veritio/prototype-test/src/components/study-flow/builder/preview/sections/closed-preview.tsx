'use client'

import { XCircle } from 'lucide-react'
import { PreviewLayout } from '../preview-layout'
import type { StudyFlowSettings } from '@veritio/prototype-test/lib/supabase/study-flow-types'

interface ClosedPreviewProps {
  settings: StudyFlowSettings['closedStudy']
}

export function ClosedPreview({ settings }: ClosedPreviewProps) {
  const { title, message } = settings

  return (
    <PreviewLayout centered>
      {/* Closed Icon */}
      <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center mx-auto mb-4">
        <XCircle className="h-6 w-6 text-stone-500" />
      </div>

      {/* Title */}
      <h1 className="text-xl font-bold tracking-tight text-stone-900 mb-3">
        {title || 'Study Closed'}
      </h1>

      {/* Message */}
      {message ? (
        <div
          className="prose prose-stone prose-sm max-w-none text-stone-600
            [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2
            [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-2
            [&_li]:my-1
            [&_p]:leading-relaxed"
          dangerouslySetInnerHTML={{ __html: message }}
        />
      ) : (
        <p className="text-sm text-muted-foreground italic">
          No closed study message configured
        </p>
      )}

      {/* Preview indicator */}
      <p className="text-xs text-muted-foreground mt-6">
        (Shown when study is inactive)
      </p>
    </PreviewLayout>
  )
}
