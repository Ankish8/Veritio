'use client'

import { Checkbox, Input, Label } from '@veritio/ui'
import { useStudyFlowBuilderStore } from '@veritio/prototype-test/stores'
import { RichTextEditor } from '../rich-text-editor'
import { useRichTextRefine } from '../sections/rich-text-refine-context'
export function RejectionMessageEditor() {
  const { flowSettings, updateScreeningSettings } = useStudyFlowBuilderStore()
  const { screening } = flowSettings
  const RefineWrapper = useRichTextRefine()

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="rejection-title">Title</Label>
        <Input
          id="rejection-title"
          value={screening.rejectionTitle}
          onChange={(e) => updateScreeningSettings({ rejectionTitle: e.target.value })}
          placeholder="e.g., Thanks for your interest"
        />
      </div>

      {/* Message */}
      <div className="space-y-2">
        <Label>Message</Label>
        {RefineWrapper ? (
          <RefineWrapper>
            {({ trailingSlot, overlaySlot, onEditorCreated }) => (
              <RichTextEditor
                content={screening.rejectionMessage}
                onChange={(html) => updateScreeningSettings({ rejectionMessage: html })}
                placeholder="Enter a message for rejected participants..."
                minHeight="150px"
                trailingSlot={trailingSlot}
                overlaySlot={overlaySlot}
                onEditorCreated={onEditorCreated}
              />
            )}
          </RefineWrapper>
        ) : (
          <RichTextEditor
            content={screening.rejectionMessage}
            onChange={(html) => updateScreeningSettings({ rejectionMessage: html })}
            placeholder="Enter a message for rejected participants..."
            minHeight="150px"
          />
        )}
      </div>

      {/* Redirect URL */}
      <div className="space-y-2">
        <Label htmlFor="redirect-url">Redirect URL</Label>
        <p className="text-sm text-muted-foreground">
          Participants will be redirected after your rejection message has displayed for 10 seconds.
        </p>
        <Input
          id="redirect-url"
          value={screening.redirectUrl || ''}
          onChange={(e) => updateScreeningSettings({ redirectUrl: e.target.value })}
          placeholder="e.g. https://yoursite.com/thanks"
        />
      </div>

      {/* Redirect Immediately */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="redirect-immediately"
          checked={screening.redirectImmediately || false}
          onCheckedChange={(checked) =>
            updateScreeningSettings({ redirectImmediately: checked === true })
          }
        />
        <Label htmlFor="redirect-immediately" className="font-normal cursor-pointer">
          Redirect immediately
        </Label>
      </div>
    </div>
  )
}
