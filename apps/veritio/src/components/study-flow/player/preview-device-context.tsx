'use client'

import { createContext, useContext } from 'react'
import type { PreviewDeviceId, PreviewOrientation } from './preview-device'

export interface PreviewDeviceContextValue {
  device: PreviewDeviceId
  setDevice: (device: PreviewDeviceId) => void
  orientation: PreviewOrientation
  toggleOrientation: () => void
}

const PreviewDeviceContext = createContext<PreviewDeviceContextValue | null>(
  null,
)

export const PreviewDeviceProvider = PreviewDeviceContext.Provider

/**
 * Device-emulation controls for the researcher preview chrome. Null outside of
 * preview mode and inside the emulated iframe (which renders the participant
 * view with no chrome at all).
 */
export function usePreviewDevice(): PreviewDeviceContextValue | null {
  return useContext(PreviewDeviceContext)
}
