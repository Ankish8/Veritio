/**
 * Device-emulation primitives for the researcher study preview.
 *
 * Server-safe on purpose: the participant page (a server component) parses the
 * `previewDevice` search param with these helpers, while the React context that
 * drives the toggle lives in `preview-device-context.tsx`.
 */

export type PreviewDeviceId = 'desktop' | 'tablet' | 'mobile'
export type PreviewOrientation = 'portrait' | 'landscape'

export interface PreviewDeviceSpec {
  id: PreviewDeviceId
  label: string
  /** Portrait CSS width of the emulated viewport. Unused for desktop. */
  width: number
  /** Portrait CSS height of the emulated viewport. Unused for desktop. */
  height: number
}

export const PREVIEW_DEVICES: Record<PreviewDeviceId, PreviewDeviceSpec> = {
  desktop: { id: 'desktop', label: 'Desktop', width: 0, height: 0 },
  tablet: { id: 'tablet', label: 'Tablet', width: 834, height: 1112 },
  mobile: { id: 'mobile', label: 'Mobile', width: 390, height: 844 },
}

export function isPreviewDeviceId(value: unknown): value is PreviewDeviceId {
  return value === 'desktop' || value === 'tablet' || value === 'mobile'
}

/** Portrait/landscape-resolved dimensions for a device. */
export function getPreviewViewport(
  device: PreviewDeviceId,
  orientation: PreviewOrientation,
): { width: number; height: number } {
  const spec = PREVIEW_DEVICES[device]
  return orientation === 'portrait'
    ? { width: spec.width, height: spec.height }
    : { width: spec.height, height: spec.width }
}
