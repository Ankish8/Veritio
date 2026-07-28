'use client'

import { useEffect, useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import {
  getPreviewViewport,
  type PreviewDeviceId,
  type PreviewOrientation,
} from './preview-device'
import { PreviewDeviceProvider } from './preview-device-context'
import { PreviewBanner } from './states/preview-banner'

interface PreviewDeviceShellProps {
  /** The preview URL rendered inside the frame (carries `previewChrome=0`). */
  embedSrc: string
  initialDevice: PreviewDeviceId
}

/**
 * Researcher preview chrome: a banner plus a resizable frame holding the study.
 *
 * The study always lives in an iframe, at every device size — that is what
 * makes switching instant. Changing device only changes the frame's CSS box, so
 * the study reflows in place (media queries key off the iframe's viewport)
 * instead of reloading, and any answers already entered survive the switch.
 */
export function PreviewDeviceShell({
  embedSrc,
  initialDevice,
}: PreviewDeviceShellProps) {
  const [device, setDevice] = useState<PreviewDeviceId>(initialDevice)
  const [orientation, setOrientation] = useState<PreviewOrientation>('portrait')

  // Keep the chosen device in the URL so a reload (or a copied link) restores
  // it. history.replaceState rather than router.replace: no re-render, and no
  // navigation that would remount the iframe.
  useEffect(() => {
    const url = new URL(window.location.href)
    if (device === 'desktop') {
      url.searchParams.delete('previewDevice')
    } else {
      url.searchParams.set('previewDevice', device)
    }
    window.history.replaceState(window.history.state, '', url.toString())
  }, [device])

  const value = useMemo(
    () => ({
      device,
      setDevice,
      orientation,
      toggleOrientation: () =>
        setOrientation((prev) =>
          prev === 'portrait' ? 'landscape' : 'portrait',
        ),
    }),
    [device, orientation],
  )

  const isDesktop = device === 'desktop'
  const viewport = getPreviewViewport(device, orientation)

  return (
    <PreviewDeviceProvider value={value}>
      <div className="flex h-dvh flex-col bg-slate-200/70">
        <PreviewBanner />
        <div
          className={cn(
            'flex min-h-0 flex-1 justify-center',
            !isDesktop && 'overflow-auto p-4 sm:p-6',
          )}
        >
          <div
            className={cn(
              'shrink-0 overflow-hidden bg-white',
              isDesktop
                ? 'h-full w-full'
                : 'max-h-full rounded-[1.75rem] border-[10px] border-slate-800 shadow-2xl',
            )}
            style={
              isDesktop
                ? undefined
                : { width: viewport.width, height: viewport.height }
            }
          >
            {/* Never re-keyed: the src stays identical across device switches,
                so the frame resizes without a reload. */}
            <iframe
              src={embedSrc}
              title="Study preview"
              className="h-full w-full border-0 bg-white"
              allow="camera; microphone; display-capture; fullscreen; clipboard-write; autoplay"
            />
          </div>
        </div>
      </div>
    </PreviewDeviceProvider>
  )
}
