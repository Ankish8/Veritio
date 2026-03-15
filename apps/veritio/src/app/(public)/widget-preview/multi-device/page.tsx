/**
 * Multi-Device Widget Preview Page
 *
 * Shows widget preview across all three device sizes simultaneously:
 * - Mobile (375px)
 * - Tablet (768px)
 * - Desktop (1440px)
 *
 * Useful for responsive testing and marketing screenshots.
 */

'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

function MultiDevicePreviewContent() {
  const searchParams = useSearchParams()

  // Build preview URL for each device
  const getPreviewUrl = (deviceHint?: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (deviceHint) params.set('device', deviceHint)
    return `/widget-preview?${params.toString()}`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 p-8">
      <div className="max-w-[1800px] mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-2">Multi-Device Preview</h1>
          <p className="text-gray-600">
            View your widget across all device sizes simultaneously
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Mobile Preview */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="bg-gray-800 text-white px-4 py-2 text-sm font-medium flex items-center justify-between">
              <span>📱 Mobile</span>
              <span className="text-gray-400">375 × 667</span>
            </div>
            <div className="p-4 bg-gray-50">
              <div
                className="mx-auto bg-white rounded-lg overflow-hidden shadow-xl border-8 border-gray-800"
                style={{
                  width: '375px',
                  height: '667px',
                  transform: 'scale(0.85)',
                  transformOrigin: 'top center',
                }}
              >
                <iframe
                  src={getPreviewUrl('mobile')}
                  className="w-full h-full border-0"
                  title="Mobile Preview"
                  sandbox="allow-scripts allow-same-origin"
                />
              </div>
            </div>
          </div>

          {/* Tablet Preview */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="bg-gray-800 text-white px-4 py-2 text-sm font-medium flex items-center justify-between">
              <span>📱 Tablet</span>
              <span className="text-gray-400">768 × 1024</span>
            </div>
            <div className="p-4 bg-gray-50">
              <div
                className="mx-auto bg-white rounded-lg overflow-hidden shadow-xl border-8 border-gray-800"
                style={{
                  width: '768px',
                  height: '1024px',
                  transform: 'scale(0.5)',
                  transformOrigin: 'top center',
                }}
              >
                <iframe
                  src={getPreviewUrl('tablet')}
                  className="w-full h-full border-0"
                  title="Tablet Preview"
                  sandbox="allow-scripts allow-same-origin"
                />
              </div>
            </div>
          </div>

          {/* Desktop Preview */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="bg-gray-800 text-white px-4 py-2 text-sm font-medium flex items-center justify-between">
              <span>🖥️ Desktop</span>
              <span className="text-gray-400">1440 × 900</span>
            </div>
            <div className="p-4 bg-gray-50">
              <div
                className="mx-auto bg-white rounded-lg overflow-hidden shadow-xl border-4 border-gray-700"
                style={{
                  width: '1440px',
                  height: '900px',
                  transform: 'scale(0.4)',
                  transformOrigin: 'top center',
                }}
              >
                <iframe
                  src={getPreviewUrl('desktop')}
                  className="w-full h-full border-0"
                  title="Desktop Preview"
                  sandbox="allow-scripts allow-same-origin"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600">
            All previews load the same widget configuration. Widget will appear after the configured
            trigger delay.
          </p>
        </div>
      </div>
    </div>
  )
}

export default function MultiDevicePreviewPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
          <div className="text-lg text-gray-600">Loading preview...</div>
        </div>
      }
    >
      <MultiDevicePreviewContent />
    </Suspense>
  )
}
