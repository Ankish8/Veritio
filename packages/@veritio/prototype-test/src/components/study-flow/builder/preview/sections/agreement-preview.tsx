'use client'

import { useState } from 'react'
import { Checkbox } from '@veritio/ui/components/checkbox'
import { Label } from '@veritio/ui/components/label'
import { PreviewLayout, PreviewButton } from '../preview-layout'
import type { StudyFlowSettings } from '@veritio/prototype-test/lib/supabase/study-flow-types'

interface AgreementPreviewProps {
  settings: StudyFlowSettings['participantAgreement']
}

export function AgreementPreview({ settings }: AgreementPreviewProps) {
  const { title, message, agreementText } = settings
  const [agreed, setAgreed] = useState(false)

  return (
    <PreviewLayout
      title={title || 'Participant Agreement'}
      actions={
        <div className="flex justify-end">
          <PreviewButton>I agree, continue</PreviewButton>
        </div>
      }
    >
      {/* Introduction message */}
      {message && (
        <div
          className="prose prose-stone prose-sm max-w-none text-stone-600 mb-4
            [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2
            [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-2
            [&_li]:my-1
            [&_p]:leading-relaxed"
          dangerouslySetInnerHTML={{ __html: message }}
        />
      )}

      {/* Agreement text box */}
      <div className="bg-stone-50 rounded-lg p-4 border border-stone-200 mb-4">
        {agreementText ? (
          <div
            className="prose prose-stone prose-sm max-w-none
              prose-p:text-stone-600 prose-p:leading-relaxed
              [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2
              [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-2
              [&_li]:text-stone-600 [&_li]:my-0.5"
            dangerouslySetInnerHTML={{ __html: agreementText }}
          />
        ) : (
          <p className="text-sm text-muted-foreground italic">
            No agreement text configured
          </p>
        )}
      </div>

      {/* Checkbox */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="preview-agreement"
          checked={agreed}
          onCheckedChange={(checked) => setAgreed(checked === true)}
        />
        <Label htmlFor="preview-agreement" className="text-sm cursor-pointer">
          I have read and agree to the above terms
        </Label>
      </div>
    </PreviewLayout>
  )
}
