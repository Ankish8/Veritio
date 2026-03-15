'use client'

import { useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import type { InterceptWidgetSettings } from '../types'

interface InteractivePreviewProps {
  settings: InterceptWidgetSettings
  participantUrl: string
  device?: 'desktop' | 'mobile' | 'tablet'
  triggerKey?: number
  reloadKey?: number
}

export function InteractivePreview({ settings, participantUrl, device = 'desktop', triggerKey = 0, reloadKey = 0 }: InteractivePreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const iframeLoadedRef = useRef(false)
  const settingsRef = useRef(settings)
  const deviceRef = useRef(device)
  const participantUrlRef = useRef(participantUrl)
  const lastReloadKeyRef = useRef(0)
  const lastTriggerKeyRef = useRef(0)

  // Always keep refs updated with latest values
  // eslint-disable-next-line react-hooks/refs
  settingsRef.current = settings
  // eslint-disable-next-line react-hooks/refs
  deviceRef.current = device
  // eslint-disable-next-line react-hooks/refs
  participantUrlRef.current = participantUrl

  // Generate URL from current refs (not reactive)
  const buildPreviewUrl = () => {
    const s = settingsRef.current
    const paramsObj: Record<string, string> = {
      'study-url': participantUrlRef.current,
      'api-base': typeof window !== 'undefined' ? window.location.origin : '',
      'position': s.position || 'bottom-right',
      'bg-color': s.backgroundColor || '#ffffff',
      'text-color': s.textColor || '#1a1a1a',
      'button-color': s.buttonColor || '#6366f1',
      'title': s.title || '',
      'description': s.description || '',
      'button-text': s.buttonText || 'Take Survey',
      'trigger': s.triggerType || 'time',
      'trigger-value': String(s.triggerValue || 5),
      'widget-style': s.widgetStyle || 'popup',
      'banner-position': s.bannerPosition || 'bottom',
      'slide-direction': s.slideDirection || 'right',
      'badge-position': s.badgePosition || 'right',
      'animation': s.animation || 'fade',
      'instant-trigger': 'true',
      'device': deviceRef.current,
    }
    return `/widget-preview?${new URLSearchParams(paramsObj).toString()}`
  }

  // Load iframe ONCE on mount
  useEffect(() => {
    if (iframeRef.current) {
      iframeRef.current.src = buildPreviewUrl()
    }
  }, []) // Empty deps - truly only on mount

  // Manual RELOAD - only when reloadKey actually increments
  useEffect(() => {
    if (reloadKey > lastReloadKeyRef.current) {
      lastReloadKeyRef.current = reloadKey
      iframeLoadedRef.current = false
      if (iframeRef.current) {
        iframeRef.current.src = buildPreviewUrl()
      }
    }
  }, [reloadKey])

  // Manual TRIGGER - only when triggerKey actually increments
  useEffect(() => {
    if (triggerKey > lastTriggerKeyRef.current) {
      lastTriggerKeyRef.current = triggerKey
      if (iframeRef.current?.contentWindow && iframeLoadedRef.current) {
        iframeRef.current.contentWindow.postMessage({ type: 'WIDGET_RETRIGGER' }, '*')
      }
    }
  }, [triggerKey])

  // Send settings to iframe for storage (NO DOM update, just memory)
  useEffect(() => {
    if (iframeRef.current?.contentWindow && iframeLoadedRef.current) {
      iframeRef.current.contentWindow.postMessage({
        type: 'WIDGET_HOT_UPDATE',
        updates: { ...settings, device },
      }, '*')
    }
  }, [settings, device])

  // Listen for iframe ready
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'WIDGET_PREVIEW_READY') {
        iframeLoadedRef.current = true
        // Send current settings to iframe once it's ready
        if (iframeRef.current?.contentWindow) {
          iframeRef.current.contentWindow.postMessage({
            type: 'WIDGET_HOT_UPDATE',
            updates: { ...settingsRef.current, device: deviceRef.current },
          }, '*')
        }
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
            device === 'tablet' && 'w-[768px]',
            device === 'mobile' && 'w-[375px]'
          )}
          style={{
            transform: 'translateZ(0)', // Force GPU acceleration
            willChange: 'width', // Optimize for width changes
          }}
        >
          {/* Browser Chrome Mockup */}
          <div className="h-full flex flex-col rounded-lg overflow-hidden border border-border shadow-lg bg-background">
            {/* Browser Header */}
            <div className="flex items-center gap-2 px-3 py-2.5 bg-muted border-b border-border flex-shrink-0">
              {/* Traffic Lights (macOS style) */}
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
              </div>

              {/* URL Bar */}
              <div className="flex-1 flex items-center gap-2 bg-background rounded-md px-3 py-1 border border-border ml-2">
                <svg
                  className="h-3.5 w-3.5 text-muted-foreground"
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
                <span className="text-xs text-muted-foreground font-medium">veritio.io/study</span>
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
