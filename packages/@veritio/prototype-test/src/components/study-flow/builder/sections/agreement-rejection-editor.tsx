'use client'

import { Label } from '@veritio/ui/components/label'
import { Input } from '@veritio/ui/components/input'
import { useStudyFlowBuilderStore } from '@veritio/prototype-test/stores'

interface AgreementRejectionEditorProps {
  studyId: string
}
export function AgreementRejectionEditor({ studyId }: AgreementRejectionEditorProps) {
  const { flowSettings, updateAgreementSettings } = useStudyFlowBuilderStore()
  const { participantAgreement } = flowSettings

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="agreement-rejection-title">Rejection Title</Label>
        <Input
          id="agreement-rejection-title"
          value={participantAgreement.rejectionTitle}
          onChange={(e) => updateAgreementSettings({ rejectionTitle: e.target.value })}
          placeholder="Thank You"
        />
      </div>

      {/* Message */}
      <div className="space-y-2">
        <Label htmlFor="agreement-rejection-message">Rejection Message</Label>
        <Input
          id="agreement-rejection-message"
          value={participantAgreement.rejectionMessage}
          onChange={(e) => updateAgreementSettings({ rejectionMessage: e.target.value })}
          placeholder="We respect your decision. Thank you for your time."
        />
        <p className="text-xs text-muted-foreground">
          This message is shown to participants who decline the agreement.
        </p>
      </div>

      {/* Redirect URL */}
      <div className="space-y-2">
        <Label htmlFor="agreement-redirect-url">Redirect URL (optional)</Label>
        <Input
          id="agreement-redirect-url"
          type="url"
          value={participantAgreement.redirectUrl || ''}
          onChange={(e) => updateAgreementSettings({ redirectUrl: e.target.value || undefined })}
          placeholder="https://example.com"
        />
        <p className="text-xs text-muted-foreground">
          Optionally redirect declined participants to another page.
        </p>
      </div>
    </div>
  )
}
