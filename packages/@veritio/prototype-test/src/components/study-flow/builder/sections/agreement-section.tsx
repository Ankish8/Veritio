'use client'

import { Label } from '@veritio/ui/components/label'
import { Switch } from '@veritio/ui/components/switch'
import { RotateCcw } from 'lucide-react'
import { useStudyFlowBuilderStore } from '@veritio/prototype-test/stores'
import { defaultParticipantAgreementSettings } from '@veritio/prototype-test/lib/study-flow/defaults'
import { Button } from '@veritio/ui/components/button'
import { CollaborativeField, CollaborativeRichText } from './collaborative-field'
import { AgreementRejectionEditor } from './agreement-rejection-editor'

interface AgreementSectionProps {
  studyId: string
}

export function AgreementSection({ studyId }: AgreementSectionProps) {
  const { flowSettings, updateAgreementSettings, selectedQuestionId } = useStudyFlowBuilderStore()
  const { participantAgreement } = flowSettings

  // Show rejection editor when rejection sub-item is selected
  if (selectedQuestionId === 'rejection') {
    return <AgreementRejectionEditor studyId={studyId} />
  }

  const resetToDefault = () => {
    updateAgreementSettings({
      title: defaultParticipantAgreementSettings.title,
      message: defaultParticipantAgreementSettings.message,
      agreementText: defaultParticipantAgreementSettings.agreementText,
      rejectionTitle: defaultParticipantAgreementSettings.rejectionTitle,
      rejectionMessage: defaultParticipantAgreementSettings.rejectionMessage,
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium">Participant Agreement</h4>
          <p className="text-sm text-muted-foreground">
            Consent form participants must accept before continuing.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={resetToDefault}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Reset to Default
        </Button>
      </div>

      <div className="space-y-2">
        <Label htmlFor="agreement-title">Title</Label>
        <CollaborativeField
          id="agreement-title"
          fieldPath="flow.agreement.title"
          value={participantAgreement.title}
          onChange={(value) => updateAgreementSettings({ title: value })}
          placeholder="Participant Agreement"
        />
      </div>

      <div className="space-y-2">
        <Label>Introduction Message</Label>
        <CollaborativeRichText
          fieldPath="flow.agreement.message"
          content={participantAgreement.message}
          onChange={(html) => updateAgreementSettings({ message: html })}
          placeholder="Explain why you need their consent..."
          minHeight="100px"
          studyId={studyId}
        />
      </div>

      <div className="space-y-2">
        <Label>Agreement Text</Label>
        <CollaborativeRichText
          fieldPath="flow.agreement.agreementText"
          content={participantAgreement.agreementText}
          onChange={(html) => updateAgreementSettings({ agreementText: html })}
          placeholder="The agreement participants must accept..."
          minHeight="180px"
          studyId={studyId}
        />
        <p className="text-xs text-muted-foreground">
          This is the actual agreement participants will accept. Include terms, data handling, etc.
        </p>
      </div>

      {/* Rejection Message Toggle */}
      <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h4 className="text-sm font-medium">Custom Rejection Message</h4>
            <p className="text-xs text-muted-foreground">
              Show a custom message when participants decline the agreement.
            </p>
          </div>
          <Switch
            checked={participantAgreement.showRejectionMessage === true}
            onCheckedChange={(checked) => updateAgreementSettings({ showRejectionMessage: checked })}
            aria-label="Toggle rejection message"
          />
        </div>

        {/* Rejection editor fields - shown when enabled */}
        {participantAgreement.showRejectionMessage === true && (
          <div className="space-y-4 pt-4 border-t">
            <div className="space-y-2">
              <Label htmlFor="agreement-rejection-title">Rejection Title</Label>
              <CollaborativeField
                id="agreement-rejection-title"
                fieldPath="flow.agreement.rejectionTitle"
                value={participantAgreement.rejectionTitle}
                onChange={(value) => updateAgreementSettings({ rejectionTitle: value })}
                placeholder="Thank You"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="agreement-rejection-message">Rejection Message</Label>
              <CollaborativeField
                id="agreement-rejection-message"
                fieldPath="flow.agreement.rejectionMessage"
                value={participantAgreement.rejectionMessage}
                onChange={(value) => updateAgreementSettings({ rejectionMessage: value })}
                placeholder="We respect your decision. Thank you for your time."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="agreement-redirect-url">Redirect URL (optional)</Label>
              <CollaborativeField
                id="agreement-redirect-url"
                fieldPath="flow.agreement.redirectUrl"
                value={participantAgreement.redirectUrl || ''}
                onChange={(value) => updateAgreementSettings({ redirectUrl: value || undefined })}
                placeholder="https://example.com"
                type="url"
              />
              <p className="text-xs text-muted-foreground">
                Optionally redirect declined participants to another page.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
