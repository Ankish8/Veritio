'use client'

import { useState } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useStudyMetaStore } from '@/stores/study-meta-store'
import { FrequencyCappingPanel } from '@/components/builders/shared/tabs/sharing/frequency-capping-panel'
import { VisitorTargetingPanel } from '@/components/builders/shared/tabs/sharing/visitor-targeting-panel'
import { AdvancedTriggerBuilder } from '@/components/builders/shared/tabs/sharing/advanced-trigger-builder'
import { PlacementZoneSelector } from '@/components/builders/shared/tabs/sharing/placement-zone-selector'
import { CopyPersonalizationPanel } from '@/components/builders/shared/tabs/sharing/copy-personalization-panel'
import { SchedulingPanel } from '@/components/builders/shared/tabs/sharing/scheduling-panel'
import { PrivacySettingsPanel } from '@/components/builders/shared/tabs/sharing/privacy-settings-panel'
import type { InterceptWidgetSettings } from '@/components/builders/shared/types'

export function BuilderWidgetSettingsPanel() {
  const { meta, updateInterceptSettings } = useStudyMetaStore()
  const [showAdvanced, setShowAdvanced] = useState(false)

  const interceptSettings = meta.sharingSettings.intercept || ({} as Partial<InterceptWidgetSettings>)

  return (
    <ScrollArea className="flex-1">
      <div className="p-4">
        {/* Frequency Capping */}
        <div className="pb-2">
          <FrequencyCappingPanel
            frequencyCapping={interceptSettings.frequencyCapping}
            onChange={(updated) => updateInterceptSettings({ frequencyCapping: updated })}
            isReadOnly={false}
          />
        </div>

        {/* Visitor Targeting */}
        <div className="pb-2">
          <VisitorTargetingPanel
            targeting={interceptSettings.targeting}
            onChange={(updated) => updateInterceptSettings({ targeting: updated })}
            isReadOnly={false}
          />
        </div>

        {/* Schedule */}
        <div className="pb-2">
          <SchedulingPanel
            scheduling={interceptSettings.scheduling}
            onChange={(updated) => updateInterceptSettings({ scheduling: updated })}
            isReadOnly={false}
          />
        </div>

        {/* Advanced Collapsible Section */}
        <div className="pt-2 border-t">
          <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
            <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium hover:text-foreground transition-colors w-full">
              <ChevronRight
                className={cn('h-4 w-4 transition-transform', showAdvanced && 'rotate-90')}
              />
              Advanced
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 mt-4">
              {/* Privacy */}
              <PrivacySettingsPanel
                privacy={interceptSettings.privacy}
                onChange={(updated) => updateInterceptSettings({ privacy: updated })}
                isReadOnly={false}
              />

              {/* Advanced Triggers */}
              <AdvancedTriggerBuilder
                advancedTriggers={interceptSettings.advancedTriggers}
                onChange={(updated) => updateInterceptSettings({ advancedTriggers: updated })}
                isReadOnly={false}
              />

              {/* Placement Zone */}
              <PlacementZoneSelector
                placement={interceptSettings.placement}
                onChange={(updated) => updateInterceptSettings({ placement: updated })}
                isReadOnly={false}
              />

              {/* Copy Personalization */}
              <CopyPersonalizationPanel
                copyPersonalization={interceptSettings.copyPersonalization}
                onChange={(updated) => updateInterceptSettings({ copyPersonalization: updated })}
                isReadOnly={false}
              />
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>
    </ScrollArea>
  )
}
