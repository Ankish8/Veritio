'use client'

import { Label } from '@veritio/ui'
import { Input } from '@veritio/ui'
import { Textarea } from '@veritio/ui'
import { useStudyFlowBuilderStore } from '@veritio/prototype-test/stores'
export function ScreeningIntroEditor() {
  const { flowSettings, updateScreeningSettings } = useStudyFlowBuilderStore()
  const { screening } = flowSettings

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="screening-intro-title">Title</Label>
        <Input
          id="screening-intro-title"
          value={screening.introTitle || ''}
          onChange={(e) => updateScreeningSettings({ introTitle: e.target.value })}
          placeholder="e.g., Quick Questions"
        />
        <p className="text-sm text-muted-foreground">
          This title appears at the top of the screening questions section.
        </p>
      </div>

      {/* Message */}
      <div className="space-y-2">
        <Label htmlFor="screening-intro-message">Subtitle Message</Label>
        <Textarea
          id="screening-intro-message"
          value={screening.introMessage || ''}
          onChange={(e) => updateScreeningSettings({ introMessage: e.target.value })}
          placeholder="e.g., Please answer these questions to help us determine your eligibility for this study."
          rows={3}
        />
        <p className="text-sm text-muted-foreground">
          A brief description shown below the title to set context for participants.
        </p>
      </div>
    </div>
  )
}
