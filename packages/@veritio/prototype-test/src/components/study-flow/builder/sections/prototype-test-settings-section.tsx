'use client'

import { Button } from '@veritio/ui/components/button'
import { ExternalLink } from 'lucide-react'
import { SettingsPanel } from '@veritio/prototype-test/builder/settings-panel'
import {
  usePrototypeTestSettings,
  usePrototypeTestActions,
} from '@veritio/prototype-test/stores/prototype-test-builder'

interface PrototypeTestSettingsSectionProps {
  onNavigateToTasks?: () => void
  onNavigateToPrototype?: () => void
}

export function PrototypeTestSettingsSection({
  onNavigateToTasks,
  onNavigateToPrototype,
}: PrototypeTestSettingsSectionProps) {
  const settings = usePrototypeTestSettings()
  const { setSettings } = usePrototypeTestActions()

  return (
    <div className="space-y-6">
      {/* Header with navigation buttons */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium">Prototype Test Settings</h4>
          <p className="text-sm text-muted-foreground">
            Configure task and prototype options for participants.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {onNavigateToTasks && (
            <Button variant="outline" size="sm" onClick={onNavigateToTasks}>
              <ExternalLink className="mr-2 h-4 w-4" />
              Edit Tasks
            </Button>
          )}
          {onNavigateToPrototype && (
            <Button variant="default" size="sm" onClick={onNavigateToPrototype}>
              <ExternalLink className="mr-2 h-4 w-4" />
              Edit Prototype
            </Button>
          )}
        </div>
      </div>

      {/* Settings panel with all the options */}
      <SettingsPanel settings={settings} onUpdate={setSettings} />
    </div>
  )
}
