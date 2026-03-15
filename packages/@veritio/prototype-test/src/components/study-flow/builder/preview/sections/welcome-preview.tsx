'use client'

import { Gift } from 'lucide-react'
import { PreviewLayout, PreviewButton } from '../preview-layout'
import { useStudyMetaStore } from '@veritio/prototype-test/stores'
import { useStudyIncentiveConfig } from '@/hooks/panel/use-panel-incentives'
import { shouldShowIncentive, replaceIncentivePlaceholder, formatIncentiveDisplay } from '@/lib/utils/format-incentive'
import type { StudyFlowSettings } from '@veritio/prototype-test/lib/supabase/study-flow-types'

interface WelcomePreviewProps {
  settings: StudyFlowSettings['welcome']
  studyId?: string
}

export function WelcomePreview({ settings, studyId }: WelcomePreviewProps) {
  const { meta } = useStudyMetaStore()
  const { config: incentiveConfig } = useStudyIncentiveConfig(studyId || null)

  const {
    title,
    message,
    includeStudyTitle,
    includeDescription,
    includePurpose,
    includeParticipantRequirements,
    showIncentive,
    incentiveMessage,
  } = settings

  // Check which items should be shown
  const showStudyTitle = includeStudyTitle
  const showDescription = includeDescription
  const showPurpose = includePurpose
  const showRequirements = includeParticipantRequirements

  const hasStudyInfo = showStudyTitle || showDescription
  const hasDetailedInfo = showPurpose || showRequirements

  // Incentive display logic
  const displayIncentive = showIncentive && shouldShowIncentive(incentiveConfig)
  const formattedIncentiveMessage = incentiveMessage
    ? replaceIncentivePlaceholder(incentiveMessage, incentiveConfig)
    : null
  const incentiveAmount = formatIncentiveDisplay(incentiveConfig)

  return (
    <PreviewLayout
      title={title || 'Welcome'}
      actions={
        <div className="flex justify-end">
          <PreviewButton>Get Started</PreviewButton>
        </div>
      }
    >
      {/* Study Title & Description - prominent, no box */}
      {hasStudyInfo && (
        <div className="mb-4">
          {showStudyTitle && (
            meta.title ? (
              <h3 className="text-base font-semibold text-stone-800 mb-0.5">
                {meta.title}
              </h3>
            ) : (
              <p className="text-sm text-amber-600 italic mb-0.5">
                Add a title in Details tab
              </p>
            )
          )}
          {showDescription && (
            meta.description ? (
              <p className="text-sm text-stone-600 leading-relaxed">
                {meta.description}
              </p>
            ) : (
              <p className="text-xs text-amber-600 italic">
                Add a description in Details tab
              </p>
            )
          )}
        </div>
      )}

      {/* Purpose & Requirements - subtle info cards */}
      {hasDetailedInfo && (
        <div className="space-y-2 mb-4">
          {showPurpose && (
            meta.purpose ? (
              <div className="bg-stone-50 border border-stone-200 rounded-md px-3 py-2">
                <p className="text-[12px] font-medium text-stone-500 uppercase tracking-wide mb-1">
                  Purpose
                </p>
                <div
                  className="text-xs text-stone-700 prose prose-stone prose-xs max-w-none
                    [&_ul]:list-disc [&_ul]:pl-4 [&_ul]:my-0.5 [&_ul]:ml-0
                    [&_ol]:list-decimal [&_ol]:pl-4 [&_ol]:my-0.5 [&_ol]:ml-0
                    [&_li]:my-0 [&_li]:pl-0
                    [&_p]:leading-relaxed [&_p]:my-0.5 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0"
                  dangerouslySetInnerHTML={{ __html: meta.purpose }}
                />
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                <p className="text-[12px] font-medium text-amber-700 uppercase tracking-wide">
                  Purpose
                </p>
                <p className="text-xs text-amber-600 italic">
                  Add a purpose in Details tab
                </p>
              </div>
            )
          )}
          {showRequirements && (
            meta.participantRequirements ? (
              <div className="bg-amber-50/50 border border-amber-200/60 rounded-md px-3 py-2">
                <p className="text-[12px] font-medium text-amber-700/80 uppercase tracking-wide mb-1">
                  Who should participate
                </p>
                <div
                  className="text-xs text-stone-700 prose prose-stone prose-xs max-w-none
                    [&_ul]:list-disc [&_ul]:pl-4 [&_ul]:my-0.5 [&_ul]:ml-0
                    [&_ol]:list-decimal [&_ol]:pl-4 [&_ol]:my-0.5 [&_ol]:ml-0
                    [&_li]:my-0 [&_li]:pl-0
                    [&_p]:leading-relaxed [&_p]:my-0.5 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0"
                  dangerouslySetInnerHTML={{ __html: meta.participantRequirements }}
                />
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                <p className="text-[12px] font-medium text-amber-700 uppercase tracking-wide">
                  Requirements
                </p>
                <p className="text-xs text-amber-600 italic">
                  Add requirements in Details tab
                </p>
              </div>
            )
          )}
        </div>
      )}

      {/* Incentive Card - always show message when toggle is on */}
      {showIncentive && (
        <div className="bg-green-50 border border-green-200 rounded-md px-3 py-2 mb-4 flex items-center gap-2">
          <Gift className="h-4 w-4 text-green-600 flex-shrink-0" />
          <p className="text-xs text-stone-700 font-medium">
            {formattedIncentiveMessage || incentiveMessage || 'Complete this study and receive {incentive}'}
          </p>
        </div>
      )}

      {/* Main welcome message */}
      {message ? (
        <div
          className="prose prose-stone prose-sm max-w-none text-stone-600
            [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2 [&_ul]:ml-0
            [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-2 [&_ol]:ml-0
            [&_li]:my-1 [&_li]:pl-1
            [&_p]:leading-relaxed"
          dangerouslySetInnerHTML={{ __html: message }}
        />
      ) : (
        <p className="text-sm text-muted-foreground italic">
          No welcome message configured
        </p>
      )}
    </PreviewLayout>
  )
}
