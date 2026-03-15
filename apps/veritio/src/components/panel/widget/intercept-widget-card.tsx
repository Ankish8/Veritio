'use client'

import { useState, useCallback, memo, useMemo } from 'react'
import type { InterceptWidgetSettings } from '../types'
import { useLocalInputSync } from '@/hooks/use-local-input-sync'
import { InteractivePreview } from './interactive-preview'
import { getStudyTypeCopy, DEFAULT_SETTINGS } from './widget-constants'
import { WidgetSettingsSection } from './widget-settings-section'

interface InterceptWidgetCardProps {
  interceptSettings?: InterceptWidgetSettings
  onInterceptSettingsChange: (updates: Partial<InterceptWidgetSettings>) => void
  participantUrl: string
  isDraft: boolean
  isReadOnly?: boolean
  primaryColor?: string
  studyType?: string
  previewDevice?: 'desktop' | 'mobile'
  previewKey?: number
}

function WidgetPreviewPanel({
  settings,
  participantUrl,
  device,
  previewKey,
}: {
  settings: InterceptWidgetSettings
  participantUrl: string
  device: 'desktop' | 'mobile'
  previewKey: number
}) {
  return (
    <div className="hidden md:flex flex-col relative sticky top-6 self-start h-[calc(100vh-180px)] flex-1 max-w-[1280px]">
      {/* Full-size preview - takes full height */}
      <div className="flex-1 rounded-lg border border-border overflow-hidden">
        <InteractivePreview
          settings={settings}
          participantUrl={participantUrl}
          device={device}
          triggerKey={previewKey}
        />
      </div>
    </div>
  )
}

export const InterceptWidgetCard = memo(function InterceptWidgetCard({
  interceptSettings,
  onInterceptSettingsChange,
  participantUrl,
  isDraft,
  isReadOnly = false,
  primaryColor = '#000000',
  studyType,
  previewDevice = 'desktop',
  previewKey = 0,
}: InterceptWidgetCardProps) {
  const [copied, setCopied] = useState(false)

  // Merge with defaults
  const settings = useMemo(() => {
    const studyTypeCopy = getStudyTypeCopy(studyType)
    return {
      ...DEFAULT_SETTINGS,
      ...studyTypeCopy,
      buttonColor: primaryColor,
      ...interceptSettings,
    }
  }, [interceptSettings, primaryColor, studyType])

  // Use local input sync for text fields
  const titleInput = useLocalInputSync(settings.title ?? '', {
    debounceMs: 500,
    onSync: (value) => onInterceptSettingsChange({ title: value }),
  })

  const descriptionInput = useLocalInputSync(settings.description ?? '', {
    debounceMs: 500,
    onSync: (value) => onInterceptSettingsChange({ description: value }),
  })

  const buttonTextInput = useLocalInputSync(settings.buttonText ?? '', {
    debounceMs: 500,
    onSync: (value) => onInterceptSettingsChange({ buttonText: value }),
  })

  // Generate embed code
  const embedCode = useMemo(() => {
    if (isDraft || !participantUrl) {
      return '<!-- Launch your study to get the embed code -->'
    }

    const origin = typeof window !== 'undefined' ? window.location.origin : ''

    // Check if using any Phase 3 features
    const hasAdvancedFeatures =
      settings.advancedTriggers?.enabled ||
      settings.widgetStyle !== 'popup' ||
      settings.scheduling?.enabled ||
      settings.privacy?.respectDoNotTrack ||
      settings.placement?.mode !== 'fixed'

    if (hasAdvancedFeatures) {
      const advancedConfig = {
        ...settings,
        studyUrl: participantUrl,
        apiBase: origin,
      }

      return `<script
  src="${origin}/intercept-widget-v3.js"
  data-study-url="${participantUrl}"
  data-config='${JSON.stringify(advancedConfig).replace(/'/g, "\\'")}'
></script>`
    }

    return `<script
  src="${origin}/intercept-widget-enhanced.js"
  data-study-url="${participantUrl}"
  data-api-base="${origin}"
  data-position="${settings.position}"
  data-trigger="${settings.triggerType}"
  data-trigger-value="${settings.triggerValue || ''}"
  data-bg-color="${settings.backgroundColor}"
  data-text-color="${settings.textColor}"
  data-button-color="${settings.buttonColor}"
  data-title="${settings.title}"
  data-description="${settings.description}"
  data-button-text="${settings.buttonText}"
></script>`
  }, [isDraft, participantUrl, settings])

  const handleCopyCode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(embedCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API may fail in some contexts
    }
  }, [embedCode])

  return (
    <div className="w-full">
      {isDraft ? (
        <div className="rounded-md bg-amber-50 border border-amber-200 p-3">
          <p className="text-sm text-amber-800">Launch your study to configure the widget.</p>
        </div>
      ) : (
        <div className="flex gap-4 pb-6 pl-4">
          {/* Left Side - Controls */}
          <div className="w-[340px] flex-shrink-0">
            {/* Widget Settings Section */}
            <WidgetSettingsSection
              settings={settings}
              onSettingsChange={onInterceptSettingsChange}
              isReadOnly={isReadOnly}
              participantUrl={participantUrl}
              isDraft={isDraft}
              titleInput={titleInput}
              descriptionInput={descriptionInput}
              buttonTextInput={buttonTextInput}
              embedCode={embedCode}
              copied={copied}
              handleCopyCode={handleCopyCode}
            />
          </div>

          {/* Right Side - Live Preview (70%) */}
          <WidgetPreviewPanel
            settings={settings}
            participantUrl={participantUrl}
            device={previewDevice}
            previewKey={previewKey}
          />
        </div>
      )}
    </div>
  )
})
