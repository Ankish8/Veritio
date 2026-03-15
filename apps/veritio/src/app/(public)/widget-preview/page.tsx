/**
 * Widget Preview Page
 *
 * Shows a demo website with the intercept widget configured from URL parameters.
 * Used for testing widget appearance and behavior before deployment.
 *
 * Features:
 * - Loads widget with settings from query params
 * - Shows widget immediately (bypasses trigger delay)
 * - Preview mode (doesn't track analytics)
 * - Professional SaaS landing page design for realistic preview
 * - Hot-update support via postMessage (no full reload for cosmetic changes)
 */

'use client'

import { useEffect, Suspense, useCallback, useRef } from 'react'
import { useSearchParams } from 'next/navigation'

// Capture settings for demographics/email collection
interface CaptureSettings {
  collectEmail?: boolean
  collectDemographics?: boolean
  demographicFields?: Array<string | { fieldType: string; required: boolean; enabled: boolean }>
}

// Config type for widget settings
interface WidgetConfig {
  studyUrl: string
  apiBase: string
  position: string
  triggerType: string
  triggerValue: number
  backgroundColor: string
  textColor: string
  buttonColor: string
  borderRadius: number
  title: string
  description: string
  buttonText: string
  widgetStyle: string
  bannerPosition: string
  slideDirection: string
  badgePosition: string
  animation: string
  previewMode: boolean
  instantTrigger: boolean
  // Panel widget capture settings
  captureSettings?: CaptureSettings
  embedCodeId?: string
}

function WidgetPreviewContent() {
  const searchParams = useSearchParams()
  const scriptRef = useRef<HTMLScriptElement | null>(null)
  const configRef = useRef<WidgetConfig | null>(null)

  // Function to clear widget storage
  const clearWidgetStorage = useCallback(() => {
    try {
      Object.keys(sessionStorage).forEach((key) => {
        if (key.startsWith('intercept_')) {
          sessionStorage.removeItem(key)
        }
      })
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('intercept_')) {
          localStorage.removeItem(key)
        }
      })
    } catch {
      // Ignore storage errors
    }
  }, [])

  // Initialize config from URL params
  const getInitialConfig = useCallback((): WidgetConfig => {
    const themeMode = searchParams.get('theme-mode') || 'light'
    const isDark = themeMode === 'dark'

    // Parse capture settings from JSON
    let captureSettings: CaptureSettings | undefined
    const captureSettingsParam = searchParams.get('capture-settings')
    if (captureSettingsParam) {
      try {
        captureSettings = JSON.parse(captureSettingsParam)
      } catch {
        // Ignore invalid JSON
      }
    }

    return {
      studyUrl: searchParams.get('study-url') || '',
      apiBase: searchParams.get('api-base') || window.location.origin,
      position: searchParams.get('position') || 'bottom-right',
      triggerType: searchParams.get('trigger') || 'time_delay',
      triggerValue: parseInt(searchParams.get('trigger-value') || '3'),
      backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
      textColor: isDark ? '#f5f5f5' : '#1a1a1a',
      buttonColor: searchParams.get('button-color') || '#7c3aed',
      borderRadius: parseInt(searchParams.get('border-radius') || '8'),
      title: searchParams.get('title') || 'Help us improve!',
      description: searchParams.get('description') || 'Share your feedback.',
      buttonText: searchParams.get('button-text') || 'Get Started',
      widgetStyle: searchParams.get('widget-style') || 'popup',
      bannerPosition: searchParams.get('banner-position') || 'bottom',
      slideDirection: searchParams.get('slide-direction') || 'right',
      badgePosition: searchParams.get('badge-position') || 'right',
      animation: searchParams.get('animation') || 'fade',
      previewMode: true,
      instantTrigger: searchParams.get('instant-trigger') === 'true',
      // Panel widget capture settings
      captureSettings,
      embedCodeId: searchParams.get('embed-code-id') || undefined,
    }
  }, [searchParams])

  // Function to create and load widget script with current config
  const loadWidgetScript = useCallback((config: WidgetConfig) => {
    const hasAdvancedTemplate = config.widgetStyle !== 'popup'
    // Use v3 widget if capture settings are enabled (for demographic modal support)
    const hasCaptureSettings = config.captureSettings?.collectEmail ||
                               (config.captureSettings?.collectDemographics &&
                                config.captureSettings?.demographicFields &&
                                config.captureSettings.demographicFields.length > 0)

    const script = document.createElement('script')

    // Use v3 widget if advanced templates are selected OR capture settings enabled
    if (hasAdvancedTemplate || hasCaptureSettings) {
      script.src = '/intercept-widget-v3.js'
      script.setAttribute('data-study-url', config.studyUrl)
      // v3 widget expects 'trigger' not 'triggerType', and 'bgColor' not 'backgroundColor'
      const v3Config = {
        ...config,
        trigger: config.triggerType,  // v3 uses 'trigger'
        bgColor: config.backgroundColor,  // v3 uses 'bgColor'
        // Panel widget capture settings
        captureSettings: config.captureSettings,
        embedCodeId: config.embedCodeId,
      }
      script.setAttribute('data-config', JSON.stringify(v3Config))
    } else {
      script.src = '/intercept-widget-enhanced.js'
      script.setAttribute('data-study-url', config.studyUrl)
      script.setAttribute('data-api-base', config.apiBase)
      script.setAttribute('data-position', config.position)
      script.setAttribute('data-trigger', config.triggerType)
      script.setAttribute('data-trigger-value', config.instantTrigger ? '0' : String(config.triggerValue))
      script.setAttribute('data-bg-color', config.backgroundColor)
      script.setAttribute('data-text-color', config.textColor)
      script.setAttribute('data-button-color', config.buttonColor)
      script.setAttribute('data-border-radius', String(config.borderRadius))
      script.setAttribute('data-title', config.title)
      script.setAttribute('data-description', config.description)
      script.setAttribute('data-button-text', config.buttonText)
      script.setAttribute('data-preview-mode', 'true')
      script.setAttribute('data-instant-trigger', config.instantTrigger ? 'true' : 'false')
    }

    document.body.appendChild(script)
    scriptRef.current = script

    script.onload = () => {
      setTimeout(() => {
        window.parent.postMessage({ type: 'WIDGET_PREVIEW_READY' }, '*')
      }, 500)
    }

    return script
  }, [])

  // Function to re-trigger the widget with current config
  const reinitializeWidget = useCallback(() => {
    // Remove existing widget elements
    const existingWidget = document.querySelector('.intercept-widget')
    const existingOverlay = document.querySelector('.intercept-widget-overlay')
    if (existingWidget?.parentNode) existingWidget.parentNode.removeChild(existingWidget)
    if (existingOverlay?.parentNode) existingOverlay.parentNode.removeChild(existingOverlay)

    // Remove existing script
    if (scriptRef.current?.parentNode) {
      scriptRef.current.parentNode.removeChild(scriptRef.current)
    }

    // Clear storage so widget thinks it's fresh
    clearWidgetStorage()

    // Load fresh widget script with current config
    const config = configRef.current || getInitialConfig()
    loadWidgetScript(config)
  }, [clearWidgetStorage, loadWidgetScript, getInitialConfig])

  // Handle postMessage events from parent window
  // MANUAL CONTROL: Changes only store in memory, widget updates only on explicit trigger
  const handleMessage = useCallback((event: MessageEvent) => {
    const { type, updates } = event.data || {}

    if (type === 'WIDGET_HOT_UPDATE' && updates) {
      // Just store the updated config - NO DOM changes
      if (configRef.current) {
        configRef.current = { ...configRef.current, ...updates }
      }
      // That's it! No reinit, no DOM updates. User must click Trigger to see changes.
    } else if (type === 'WIDGET_RETRIGGER') {
      // Manual trigger - reinitialize widget with current stored config
      reinitializeWidget()
    }
  }, [reinitializeWidget])

  useEffect(() => {
    window.addEventListener('message', handleMessage)
    clearWidgetStorage()

    // Initialize config from URL params and store it
    const initialConfig = getInitialConfig()
    configRef.current = initialConfig
    const script = loadWidgetScript(initialConfig)

    return () => {
      window.removeEventListener('message', handleMessage)
      if (script.parentNode) {
        script.parentNode.removeChild(script)
      }
    }
  }, [searchParams, handleMessage, clearWidgetStorage, loadWidgetScript, getInitialConfig])

  return (
    <div className="min-h-screen bg-neutral-50">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        body { font-family: 'Inter', sans-serif; }
      `}</style>

      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-gradient-to-br from-indigo-100/40 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />

        <div className="relative max-w-7xl mx-auto px-6 lg:px-12 py-16 lg:py-20">
          <div className="max-w-3xl">
            <div className="inline-block mb-4 px-3 py-1.5 bg-indigo-50 border border-indigo-100 rounded-full">
              <span className="text-sm font-medium text-indigo-900">Widget Preview Mode</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 mb-4 leading-[1.1]">
              Transform Your
              <span className="block text-indigo-600">User Research</span>
            </h1>

            <p className="text-base lg:text-lg text-slate-600 leading-relaxed mb-6 max-w-2xl">
              Capture meaningful insights at the perfect moment.
            </p>

            <div className="flex flex-wrap gap-3">
              <button className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg">
                Get Started Free
              </button>
              <button className="px-6 py-3 bg-white text-slate-700 font-semibold rounded-lg border border-slate-200">
                View Demo
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-12">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { value: '50K+', label: 'Active Users' },
              { value: '98%', label: 'Satisfaction Rate' },
              { value: '2M+', label: 'Responses Collected' },
              { value: '<5min', label: 'Setup Time' }
            ].map((stat, idx) => (
              <div key={idx} className="text-center">
                <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 mb-1">
                  {stat.value}
                </div>
                <div className="text-xs sm:text-sm text-slate-600">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-6 lg:px-12 py-16">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 mb-3">
            Built for Modern Teams
          </h2>
          <p className="text-base lg:text-lg text-slate-600 max-w-2xl mx-auto">
            Everything you need to collect and analyze user feedback.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            { title: 'Lightning Fast', description: 'Optimized for performance with minimal impact on page speed.' },
            { title: 'Smart Targeting', description: 'Show surveys to the right users at the right time.' },
            { title: 'Easy Integration', description: 'One-line installation that works with any website.' }
          ].map((feature, idx) => (
            <div key={idx} className="p-6 bg-white rounded-xl border border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">{feature.title}</h3>
              <p className="text-slate-600 text-sm">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-indigo-600 text-white">
        <div className="max-w-4xl mx-auto px-6 lg:px-12 py-16 text-center">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-indigo-100 mb-8 max-w-xl mx-auto">
            Join thousands of teams collecting meaningful user insights.
          </p>
          <button className="px-8 py-3 bg-white text-indigo-600 font-semibold rounded-lg">
            Start Free Trial
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-8">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 text-center">
          <p className="text-sm">© 2026 Widget Preview</p>
        </div>
      </footer>
    </div>
  )
}

export default function WidgetPreviewPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-neutral-50" />}>
      <WidgetPreviewContent />
    </Suspense>
  )
}
