'use client'

import { Label } from '@veritio/ui/components/label'
import { Input } from '@veritio/ui/components/input'
import { Switch } from '@veritio/ui/components/switch'
import { Gift, RotateCcw } from 'lucide-react'
import { useStudyFlowBuilderStore } from '@veritio/prototype-test/stores'
import { defaultWelcomeSettings } from '@veritio/prototype-test/lib/study-flow/defaults'
import { Button } from '@veritio/ui/components/button'
import { CollaborativeField, CollaborativeRichText } from './collaborative-field'
import { useIncentiveToggle } from './use-incentive-toggle'
import { IncentiveConfirmDialog } from './incentive-confirm-dialog'
import { IncentiveWarning } from './incentive-warning'

interface WelcomeSectionProps {
  studyId: string
}

export function WelcomeSection({ studyId }: WelcomeSectionProps) {
  const { flowSettings, updateWelcomeSettings } = useStudyFlowBuilderStore()
  const { welcome } = flowSettings

  const incentive = useIncentiveToggle({
    studyId,
    updateSettings: updateWelcomeSettings,
  })

  const resetToDefault = () => {
    updateWelcomeSettings({
      title: defaultWelcomeSettings.title,
      message: defaultWelcomeSettings.message,
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium">Welcome Message</h4>
          <p className="text-sm text-muted-foreground">
            Introduce participants to your study.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={resetToDefault}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Reset to Default
        </Button>
      </div>

      <div className="space-y-2">
        <Label htmlFor="welcome-title">Title</Label>
        <CollaborativeField
          id="welcome-title"
          fieldPath="flow.welcome.title"
          value={welcome.title}
          onChange={(value) => updateWelcomeSettings({ title: value })}
          placeholder="Welcome"
        />
      </div>

      {/* Include from Details toggles */}
      <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
        <div>
          <h4 className="text-sm font-medium">Include from Details</h4>
          <p className="text-xs text-muted-foreground">
            Show these fields from the Details tab above the welcome message.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="include-study-title" className="text-sm font-normal cursor-pointer">
              Study Title
            </Label>
            <Switch
              id="include-study-title"
              checked={welcome.includeStudyTitle || false}
              onCheckedChange={(checked) => updateWelcomeSettings({ includeStudyTitle: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="include-description" className="text-sm font-normal cursor-pointer">
              Description
            </Label>
            <Switch
              id="include-description"
              checked={welcome.includeDescription || false}
              onCheckedChange={(checked) => updateWelcomeSettings({ includeDescription: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="include-purpose" className="text-sm font-normal cursor-pointer">
              Purpose
            </Label>
            <Switch
              id="include-purpose"
              checked={welcome.includePurpose || false}
              onCheckedChange={(checked) => updateWelcomeSettings({ includePurpose: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="include-requirements" className="text-sm font-normal cursor-pointer">
              Requirements
            </Label>
            <Switch
              id="include-requirements"
              checked={welcome.includeParticipantRequirements || false}
              onCheckedChange={(checked) => updateWelcomeSettings({ includeParticipantRequirements: checked })}
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Message</Label>
        <CollaborativeRichText
          fieldPath="flow.welcome.message"
          content={welcome.message}
          onChange={(html) => updateWelcomeSettings({ message: html })}
          placeholder="Enter a welcome message for participants..."
          minHeight="150px"
          studyId={studyId}
        />
        <p className="text-xs text-muted-foreground">
          Introduce participants to your study and explain what they&apos;ll be doing.
        </p>
      </div>

      {/* Incentive display settings */}
      <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Gift className="h-4 w-4 text-muted-foreground" />
          <h4 className="text-sm font-medium">Incentive Display</h4>
        </div>
        <p className="text-xs text-muted-foreground">
          Show incentive information to participants on the welcome screen.
        </p>

        <div className="flex items-center justify-between">
          <Label htmlFor="show-incentive" className="text-sm font-normal cursor-pointer">
            Show Incentive
          </Label>
          <Switch
            id="show-incentive"
            checked={welcome.showIncentive || false}
            onCheckedChange={incentive.handleShowIncentiveChange}
          />
        </div>

        {welcome.showIncentive && !incentive.hasValidIncentive && <IncentiveWarning />}

        {welcome.showIncentive && (
          <div className="space-y-2">
            <Label htmlFor="incentive-message" className="text-sm">
              Incentive Message
            </Label>
            <Input
              id="incentive-message"
              value={welcome.incentiveMessage ?? 'Complete this study and receive {incentive}'}
              onChange={(e) => updateWelcomeSettings({ incentiveMessage: e.target.value })}
              placeholder="Complete this study and receive {incentive}"
            />
            <p className="text-xs text-muted-foreground">
              Use <code className="bg-muted px-1 rounded">{'{incentive}'}</code> placeholder for amount and type (e.g., &quot;$90 Gift Card&quot;)
            </p>
          </div>
        )}
      </div>

      <IncentiveConfirmDialog
        open={incentive.showConfirmDialog}
        onOpenChange={incentive.setShowConfirmDialog}
        onConfirm={incentive.handleConfirmEnable}
      />
    </div>
  )
}
