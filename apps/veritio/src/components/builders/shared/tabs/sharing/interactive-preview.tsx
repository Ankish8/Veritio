'use client'

import { useRef, useMemo, useEffect } from 'react'
import { cn } from '@/lib/utils'
import type { InterceptWidgetSettings } from '../../types'

interface InteractivePreviewProps {
  settings: InterceptWidgetSettings
  participantUrl: string
  device?: 'desktop' | 'mobile'
  triggerKey?: number
  reloadKey?: number
}

// Keys that can be hot-updated without iframe reload (cosmetic changes)
// Note: backgroundColor and textColor are now fixed for accessibility
const HOT_UPDATE_KEYS: (keyof InterceptWidgetSettings)[] = [
  'buttonColor',
  'title',
  'description',
  'buttonText',
  'position',
]

export function InteractivePreview({ settings, participantUrl, device = 'desktop', triggerKey = 0, reloadKey = 0 }: InteractivePreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const prevSettingsRef = useRef<InterceptWidgetSettings | null>(null)
  const iframeLoadedRef = useRef(false)

  // Compute a fingerprint for structural settings - changes trigger iframe reload
  // This is computed from settings that affect widget structure (not just appearance)
  // reloadKey is included to allow manual full reload via Reload button
  // triggerType is included because changing between time/scroll/exit requires reload
  // captureSettings is included because drawer/modal form rendering depends on it
  const structuralFingerprint = useMemo(() => {
    return JSON.stringify({
      widgetStyle: settings.widgetStyle || 'popup',
      animation: settings.animation || 'fade',
      bannerPosition: settings.bannerPosition || 'bottom',
      slideDirection: settings.slideDirection || 'right',
      badgePosition: settings.badgePosition || 'right',
      triggerType: settings.triggerType || 'time_delay',
      device: device,
      reloadKey: reloadKey,
      // Include captureSettings so drawer form is re-rendered when email/demographics change
      captureSettings: settings.captureSettings,
    })
  }, [settings.widgetStyle, settings.animation, settings.bannerPosition, settings.slideDirection, settings.badgePosition, settings.triggerType, device, reloadKey, settings.captureSettings])

  // Generate preview URL with all settings
  // URL changes when structural fingerprint changes (triggers reload)
  // Note: bg-color and text-color are determined by theme mode from user branding
  const previewUrl = useMemo(() => {
    // Determine colors based on theme mode
    const themeMode = settings.themeMode || 'light'
    const isDark = themeMode === 'dark'
    const bgColor = isDark ? '#1a1a1a' : '#ffffff'
    const textColor = isDark ? '#f5f5f5' : '#1a1a1a'

    const params = new URLSearchParams({
      'study-url': participantUrl,
      'api-base': typeof window !== 'undefined' ? window.location.origin : '',
      'position': settings.position,
      'bg-color': bgColor,
      'text-color': textColor,
      'button-color': settings.buttonColor,
      'title': settings.title,
      'description': settings.description,
      'button-text': settings.buttonText,
      'trigger': settings.triggerType,
      'trigger-value': String(settings.triggerValue || 5),
      // Widget template settings
      'widget-style': settings.widgetStyle || 'popup',
      'banner-position': settings.bannerPosition || 'bottom',
      'slide-direction': settings.slideDirection || 'right',
      'badge-position': settings.badgePosition || 'right',
      'animation': settings.animation || 'fade',
      // Only use instant trigger for time delay - let scroll/exit intent work naturally
      'instant-trigger': settings.triggerType === 'time_delay' ? 'true' : 'false',
      'device': device, // Pass device for responsive preview
      // Branding settings
      'theme-mode': themeMode,
      'border-radius': String(settings.borderRadius ?? 8),
    })

    // Add capture settings for demographics/email collection (JSON-encoded)
    if (settings.captureSettings) {
      params.set('capture-settings', JSON.stringify(settings.captureSettings))
    }
    if (settings.embedCodeId) {
      params.set('embed-code-id', settings.embedCodeId)
    }

    return `/widget-preview?${params.toString()}`
  }, [participantUrl, settings, device])

  // Handle structural changes - reload iframe when fingerprint changes
  const prevFingerprintRef = useRef<string>('')
  useEffect(() => {
    const prevFingerprint = prevFingerprintRef.current
    prevFingerprintRef.current = structuralFingerprint

    // Always load on first render or when structural settings change
    if (!prevFingerprint || prevFingerprint !== structuralFingerprint) {
      iframeLoadedRef.current = false
      if (iframeRef.current) {
        iframeRef.current.src = previewUrl
      }
    }
  }, [structuralFingerprint, previewUrl])

  // Handle hot-updatable changes - send via postMessage without reload
  useEffect(() => {
    const prevSettings = prevSettingsRef.current
    prevSettingsRef.current = settings

    // Skip first render (handled by structural effect)
    if (!prevSettings) return

    // Check for hot-updatable changes only
    const hotUpdates: Partial<InterceptWidgetSettings> = {}
    HOT_UPDATE_KEYS.forEach((key) => {
      if (prevSettings[key] !== settings[key]) {
        ;(hotUpdates as Record<string, unknown>)[key] = settings[key]
      }
    })

    if (Object.keys(hotUpdates).length > 0 && iframeRef.current?.contentWindow && iframeLoadedRef.current) {
      iframeRef.current.contentWindow.postMessage({ type: 'WIDGET_HOT_UPDATE', updates: hotUpdates }, '*')
    }
  }, [settings])

  // Handle explicit trigger (replay button) - use postMessage to re-show widget without reload
  const prevTriggerKeyRef = useRef(triggerKey)
  useEffect(() => {
    // Only fire when triggerKey actually changes (not on initial render or other re-renders)
    if (triggerKey > 0 && triggerKey !== prevTriggerKeyRef.current && iframeRef.current?.contentWindow) {
      // Send retrigger message to iframe - widget will show/hide with animation
      iframeRef.current.contentWindow.postMessage({
        type: 'WIDGET_RETRIGGER',
      }, '*')
    }
    prevTriggerKeyRef.current = triggerKey
  }, [triggerKey, previewUrl])

  // Listen for iframe load confirmation
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'WIDGET_PREVIEW_READY') {
        iframeLoadedRef.current = true
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: '#f5f5f4' }}>
      {/* Preview Frame with Safari-style browser chrome - fills full height */}
      <div className="flex-1 flex flex-col p-4">
        <div
          className={cn(
            'mx-auto flex-1 transition-all duration-300 ease-out',
            device === 'desktop' && 'w-full',
            device === 'mobile' && 'w-[375px]'
          )}
          style={{
            transform: 'translateZ(0)', // Force GPU acceleration
            willChange: 'width', // Optimize for width changes
          }}
        >
          {/* Browser Chrome Mockup */}
          <div className="h-full flex flex-col rounded-lg overflow-hidden border border-stone-300 shadow-lg bg-white">
            {/* Browser Header */}
            <div className="flex items-center gap-2 px-3 py-2.5 bg-stone-100 border-b border-stone-300 flex-shrink-0">
              {/* Traffic Lights (macOS style) */}
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
              </div>

              {/* URL Bar */}
              <div className="flex-1 flex items-center gap-2 bg-white rounded-md px-3 py-1 border border-stone-300 ml-2">
                <svg
                  className="h-3.5 w-3.5 text-stone-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
                <span className="text-xs text-stone-600 font-medium">veritio.io/study</span>
              </div>
            </div>

            {/* Iframe Content */}
            <div className="flex-1 overflow-hidden">
              <iframe
                ref={iframeRef}
                className="w-full h-full"
                title="Widget Preview"
                sandbox="allow-scripts allow-same-origin"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
