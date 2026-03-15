'use client'

/**
 * Wrapper that seeds SWR cache with server-prefetched team settings data.
 */

import { SWRConfig } from 'swr'
import { TeamSettingsClient } from './team-settings-client'

interface TeamSettingsClientWrapperProps {
  organizationId: string
  swrFallback: Record<string, unknown>
}

export function TeamSettingsClientWrapper({ organizationId, swrFallback }: TeamSettingsClientWrapperProps) {
  const hasFallback = Object.keys(swrFallback).length > 0
  return (
    <SWRConfig value={{ fallback: swrFallback }}>
      <TeamSettingsClient organizationId={organizationId} serverPrefetched={hasFallback} />
    </SWRConfig>
  )
}
