'use client'

import { Monitor, RotateCw, Smartphone, Tablet } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  PREVIEW_DEVICES,
  getPreviewViewport,
  usePreviewDevice,
  type PreviewDeviceId,
} from './preview-device-context'

const OPTIONS: { id: PreviewDeviceId; icon: LucideIcon }[] = [
  { id: 'desktop', icon: Monitor },
  { id: 'tablet', icon: Tablet },
  { id: 'mobile', icon: Smartphone },
]

/**
 * Segmented device switcher shown in the preview banner. Non-desktop sizes
 * render the study inside a fixed-width iframe, so CSS media queries resolve
 * against the emulated viewport rather than the researcher's window.
 */
export function PreviewDeviceToggle() {
  const controls = usePreviewDevice()
  if (!controls) return null

  const { device, setDevice, orientation, toggleOrientation } = controls
  const viewport = getPreviewViewport(device, orientation)

  return (
    <div className="flex items-center gap-0.5 rounded-md border border-slate-200 bg-white p-0.5 shadow-sm">
      {OPTIONS.map(({ id, icon: Icon }) => {
        const spec = PREVIEW_DEVICES[id]
        const isActive = device === id
        return (
          <button
            key={id}
            type="button"
            onClick={() => setDevice(id)}
            aria-pressed={isActive}
            title={
              id === 'desktop'
                ? 'Desktop (your window size)'
                : `${spec.label} (${spec.width} × ${spec.height})`
            }
            className={cn(
              'rounded p-1.5 transition-colors',
              isActive
                ? 'bg-slate-100 text-slate-900'
                : 'text-slate-500 hover:text-slate-900',
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            <span className="sr-only">{spec.label} preview</span>
          </button>
        )
      })}

      {device !== 'desktop' && (
        <>
          <span className="mx-0.5 h-4 w-px bg-slate-200" aria-hidden />
          <button
            type="button"
            onClick={toggleOrientation}
            title={`Rotate to ${orientation === 'portrait' ? 'landscape' : 'portrait'}`}
            className="rounded p-1.5 text-slate-500 transition-colors hover:text-slate-900"
          >
            <RotateCw className="h-3.5 w-3.5" />
            <span className="sr-only">Rotate preview</span>
          </button>
          <span className="px-1 text-xs tabular-nums text-slate-500">
            {viewport.width} × {viewport.height}
          </span>
        </>
      )}
    </div>
  )
}
