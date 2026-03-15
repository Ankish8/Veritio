'use client'

/**
 * Wrapper that seeds SWR cache with server-prefetched incentive data.
 */

import { SWRConfig } from 'swr'
import { IncentivesClient } from './incentives-client'

interface IncentivesClientWrapperProps {
  swrFallback: Record<string, unknown>
  serverPrefetched?: boolean
}

export function IncentivesClientWrapper({ swrFallback, serverPrefetched: _serverPrefetched }: IncentivesClientWrapperProps) {
  const hasFallback = Object.keys(swrFallback).length > 0
  return (
    <SWRConfig value={{ fallback: swrFallback }}>
      <IncentivesClient serverPrefetched={hasFallback} />
    </SWRConfig>
  )
}
