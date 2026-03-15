'use client'

import { ScrollArea } from '@/components/ui/scroll-area'
import { usePrototypeTestBuilderStore } from '@/stores/study-builder'
import { SettingsPanel } from '@veritio/prototype-test/builder/settings-panel'

export function BuilderPrototypeTaskOptionsPanel() {
  const { settings, setSettings } = usePrototypeTestBuilderStore()

  return (
    <ScrollArea className="flex-1">
      <div className="p-4">
        <SettingsPanel
          settings={settings}
          onUpdate={setSettings}
        />
      </div>
    </ScrollArea>
  )
}
