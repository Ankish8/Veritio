'use client'

import { useUserPreferences } from '@/hooks'
import { Loader2, CheckCircle2 } from 'lucide-react'
import {
  DEFAULT_STUDY_DEFAULTS,
  type StudyDefaults,
  type DeepPartial,
} from '@/lib/supabase/user-preferences-types'
import {
  BrandingDefaultsSection,
  SettingsDefaultsSection,
  NotificationsDefaultsSection,
  useDebounceSync,
} from './study-defaults'

function deepMergeDefaults(target: StudyDefaults, source: DeepPartial<StudyDefaults>): StudyDefaults {
  return {
    branding: {
      ...target.branding,
      ...(source.branding || {}),
    },
    settings: {
      ...target.settings,
      ...(source.settings || {}),
    },
    notifications: {
      ...target.notifications,
      ...(source.notifications || {}),
    },
  }
}

function mergePartials(
  target: DeepPartial<StudyDefaults> | null,
  source: DeepPartial<StudyDefaults>
): DeepPartial<StudyDefaults> {
  if (!target) return source

  const result: DeepPartial<StudyDefaults> = {}

  if (target.branding || source.branding) {
    result.branding = { ...target.branding, ...source.branding }
  }
  if (target.settings || source.settings) {
    result.settings = { ...target.settings, ...source.settings }
  }
  if (target.notifications || source.notifications) {
    result.notifications = { ...target.notifications, ...source.notifications }
  }

  return result
}

export function StudyDefaultsTab() {
  const { preferences, updateStudyDefaults } = useUserPreferences()

  const { localState: localDefaults, saveStatus, handleUpdate } = useDebounceSync({
    serverData: preferences?.studyDefaults,
    defaults: DEFAULT_STUDY_DEFAULTS,
    mergeIntoState: deepMergeDefaults,
    mergePartials,
    saveToApi: updateStudyDefaults,
  })

  return (
    <div className="space-y-6">
      {/* Header with save status */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          These defaults will be applied to all new studies you create. You can always override
          them in each study's settings.
        </p>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-shrink-0 ml-4">
          {saveStatus === 'saving' && (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Saving...</span>
            </>
          )}
          {saveStatus === 'saved' && (
            <>
              <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
              <span className="text-green-600">Saved</span>
            </>
          )}
        </div>
      </div>

      {/* Branding Defaults */}
      <BrandingDefaultsSection
        branding={localDefaults.branding}
        onUpdate={handleUpdate}
      />

      {/* Settings Defaults */}
      <SettingsDefaultsSection
        settings={localDefaults.settings}
        onUpdate={handleUpdate}
      />

      {/* Notification Defaults */}
      <NotificationsDefaultsSection
        notifications={localDefaults.notifications}
        onUpdate={handleUpdate}
      />
    </div>
  )
}
