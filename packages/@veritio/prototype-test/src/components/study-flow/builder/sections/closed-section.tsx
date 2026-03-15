'use client'

import { Label } from '@veritio/ui/components/label'
import { Checkbox } from '@veritio/ui/components/checkbox'
import { RotateCcw } from 'lucide-react'
import { useStudyFlowBuilderStore } from '@veritio/prototype-test/stores'
import { defaultClosedStudySettings } from '@veritio/prototype-test/lib/study-flow/defaults'
import { Button } from '@veritio/ui/components/button'
import { CollaborativeField } from './collaborative-field'

export function ClosedSection() {
  const { flowSettings, updateClosedSettings } = useStudyFlowBuilderStore()
  const { closedStudy } = flowSettings

  const resetToDefault = () => {
    updateClosedSettings({
      title: defaultClosedStudySettings.title,
      message: defaultClosedStudySettings.message,
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium">Closed Study Message</h4>
          <p className="text-sm text-muted-foreground">
            Shown when someone tries to access an inactive study.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={resetToDefault}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Reset to Default
        </Button>
      </div>

      <div className="space-y-2">
        <Label htmlFor="closed-title">Title</Label>
        <CollaborativeField
          id="closed-title"
          fieldPath="flow.closed.title"
          value={closedStudy.title}
          onChange={(value) => updateClosedSettings({ title: value })}
          placeholder="Study Closed"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="closed-message">Message</Label>
        <CollaborativeField
          id="closed-message"
          fieldPath="flow.closed.message"
          value={closedStudy.message}
          onChange={(value) => updateClosedSettings({ message: value })}
          placeholder="This study is no longer accepting responses..."
        />
      </div>

      <div className="rounded-lg border bg-muted/30 p-4">
        <h4 className="mb-3 text-sm font-medium">Redirect Settings (Optional)</h4>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="closed-redirect">Redirect URL</Label>
            <CollaborativeField
              id="closed-redirect"
              fieldPath="flow.closed.redirectUrl"
              value={closedStudy.redirectUrl || ''}
              onChange={(value) => updateClosedSettings({ redirectUrl: value || undefined })}
              placeholder="https://example.com"
              type="url"
            />
          </div>

          {closedStudy.redirectUrl && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="redirect-immediately"
                checked={closedStudy.redirectImmediately}
                onCheckedChange={(checked) =>
                  updateClosedSettings({ redirectImmediately: checked === true })
                }
              />
              <Label htmlFor="redirect-immediately" className="text-sm font-normal cursor-pointer">
                Redirect immediately (don&apos;t show message)
              </Label>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
