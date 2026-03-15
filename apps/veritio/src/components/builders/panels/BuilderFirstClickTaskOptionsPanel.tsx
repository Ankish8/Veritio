'use client'

import { ScrollArea } from '@/components/ui/scroll-area'
import { SettingsPanel } from '../first-click/settings-panel'

export function BuilderFirstClickTaskOptionsPanel() {
  return (
    <ScrollArea className="flex-1">
      <SettingsPanel />
    </ScrollArea>
  )
}
