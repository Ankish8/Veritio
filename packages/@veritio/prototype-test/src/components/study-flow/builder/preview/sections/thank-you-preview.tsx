'use client'

import { Check, Gift } from 'lucide-react'
import { PreviewLayout } from '../preview-layout'
import { useStudyIncentiveConfig } from '@/hooks/panel/use-panel-incentives'
import { shouldShowIncentive, replaceIncentivePlaceholder } from '@/lib/utils/format-incentive'
import type { StudyFlowSettings } from '@veritio/prototype-test/lib/supabase/study-flow-types'

interface ThankYouPreviewProps {
  settings: StudyFlowSettings['thankYou']
  studyId?: string
}

export function ThankYouPreview({ settings, studyId }: ThankYouPreviewProps) {
  const { config: incentiveConfig } = useStudyIncentiveConfig(studyId || null)
  const { title, message, showIncentive, incentiveMessage } = settings

  // Incentive display logic
  const displayIncentive = showIncentive && shouldShowIncentive(incentiveConfig)
  const formattedIncentiveMessage = incentiveMessage
    ? replaceIncentivePlaceholder(incentiveMessage, incentiveConfig)
    : null

  return (
    <PreviewLayout centered>
      {/* Success Icon */}
      <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
        <Check className="h-6 w-6 text-green-600" />
      </div>

      {/* Title */}
      <h1 className="text-xl font-bold tracking-tight text-stone-900 mb-3">
        {title || 'Thank You!'}
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
          No thank you message configured
        </p>
      )}

      {/* Incentive Confirmation - always show message when toggle is on */}
      {showIncentive && (
        <div className="bg-green-50 border border-green-200 rounded-md px-3 py-2 mt-4 flex items-center justify-center gap-2">
          <Gift className="h-4 w-4 text-green-600 flex-shrink-0" />
          <p className="text-xs text-stone-700 font-medium">
            {formattedIncentiveMessage || incentiveMessage || 'Your {incentive} will be sent to you soon'}
          </p>
        </div>
      )}

      {/* Preview indicator */}
      <p className="text-xs text-muted-foreground mt-6">
        (End of study preview)
      </p>
    </PreviewLayout>
  )
}
