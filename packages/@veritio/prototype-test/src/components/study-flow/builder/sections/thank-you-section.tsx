'use client'

import { Label } from '@veritio/ui/components/label'
import { Switch } from '@veritio/ui/components/switch'
import { Gift, RotateCcw } from 'lucide-react'
import { useStudyFlowBuilderStore } from '@veritio/prototype-test/stores'
import { defaultThankYouSettings } from '@veritio/prototype-test/lib/study-flow/defaults'
import { Button } from '@veritio/ui/components/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@veritio/ui/components/select'
import { CollaborativeField, CollaborativeRichText } from './collaborative-field'
import { useIncentiveToggle } from './use-incentive-toggle'
import { IncentiveConfirmDialog } from './incentive-confirm-dialog'
import { IncentiveWarning } from './incentive-warning'

interface ThankYouSectionProps {
  studyId: string
}

export function ThankYouSection({ studyId }: ThankYouSectionProps) {
  const { flowSettings, updateThankYouSettings } = useStudyFlowBuilderStore()
  const { thankYou } = flowSettings

  const incentive = useIncentiveToggle({
    studyId,
    updateSettings: updateThankYouSettings,
  })

  const resetToDefault = () => {
    updateThankYouSettings({
      title: defaultThankYouSettings.title,
      message: defaultThankYouSettings.message,
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium">Thank You Message</h4>
          <p className="text-sm text-muted-foreground">
            Shown after the participant completes the study.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={resetToDefault}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Reset to Default
        </Button>
      </div>

      <div className="space-y-2">
        <Label htmlFor="thankyou-title">Title</Label>
        <CollaborativeField
          id="thankyou-title"
          fieldPath="flow.thankYou.title"
          value={thankYou.title}
          onChange={(value) => updateThankYouSettings({ title: value })}
          placeholder="Thank You!"
        />
      </div>

      <div className="space-y-2">
        <Label>Message</Label>
        <CollaborativeRichText
          fieldPath="flow.thankYou.message"
          content={thankYou.message}
          onChange={(html) => updateThankYouSettings({ message: html })}
          placeholder="Thank participants for their time..."
          minHeight="150px"
          studyId={studyId}
        />
      </div>

      {/* Incentive confirmation settings */}
      <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Gift className="h-4 w-4 text-muted-foreground" />
          <h4 className="text-sm font-medium">Incentive Confirmation</h4>
        </div>
        <p className="text-xs text-muted-foreground">
          Show incentive confirmation message after study completion.
        </p>

        <div className="flex items-center justify-between">
          <Label htmlFor="show-incentive-thankyou" className="text-sm font-normal cursor-pointer">
            Show Incentive Confirmation
          </Label>
          <Switch
            id="show-incentive-thankyou"
            checked={thankYou.showIncentive || false}
            onCheckedChange={incentive.handleShowIncentiveChange}
          />
        </div>

        {thankYou.showIncentive && !incentive.hasValidIncentive && <IncentiveWarning />}

        {thankYou.showIncentive && (
          <div className="space-y-2">
            <Label htmlFor="incentive-message-thankyou" className="text-sm">
              Confirmation Message
            </Label>
            <CollaborativeField
              id="incentive-message-thankyou"
              fieldPath="flow.thankYou.incentiveMessage"
              value={thankYou.incentiveMessage ?? 'Your {incentive} will be sent to you soon'}
              onChange={(value) => updateThankYouSettings({ incentiveMessage: value })}
              placeholder="Your {incentive} will be sent to you soon"
            />
            <p className="text-xs text-muted-foreground">
              Use <code className="bg-muted px-1 rounded">{'{incentive}'}</code> placeholder for amount and type
            </p>
          </div>
        )}
      </div>

      <div className="rounded-lg border bg-muted/30 p-4">
        <h4 className="mb-3 text-sm font-medium">Redirect Settings (Optional)</h4>
        <p className="mb-4 text-xs text-muted-foreground">
          Optionally redirect participants to another page after completion.
        </p>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="thankyou-redirect">Redirect URL</Label>
            <CollaborativeField
              id="thankyou-redirect"
              fieldPath="flow.thankYou.redirectUrl"
              value={thankYou.redirectUrl || ''}
              onChange={(value) => updateThankYouSettings({ redirectUrl: value || undefined })}
              placeholder="https://example.com"
              type="url"
            />
          </div>

          {thankYou.redirectUrl && (
            <div className="space-y-2">
              <Label htmlFor="redirect-delay">Redirect Delay</Label>
              <Select
                value={String(thankYou.redirectDelay || 0)}
                onValueChange={(value) => updateThankYouSettings({ redirectDelay: parseInt(value) })}
              >
                <SelectTrigger id="redirect-delay">
                  <SelectValue placeholder="Select delay" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">No redirect (show link only)</SelectItem>
                  <SelectItem value="3">3 seconds</SelectItem>
                  <SelectItem value="5">5 seconds</SelectItem>
                  <SelectItem value="10">10 seconds</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                How long to wait before automatically redirecting.
              </p>
            </div>
          )}
        </div>
      </div>

      <IncentiveConfirmDialog
        open={incentive.showConfirmDialog}
        onOpenChange={incentive.setShowConfirmDialog}
        onConfirm={incentive.handleConfirmEnable}
        title="Enable Incentive Confirmation?"
      />
    </div>
  )
}
