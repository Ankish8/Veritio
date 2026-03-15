'use client'

/**
 * Wrapper that seeds SWR cache with server-prefetched segment data.
 */

import { SWRConfig } from 'swr'
import { SegmentsClient } from './segments-client'

interface SegmentsClientWrapperProps {
  swrFallback: Record<string, unknown>
  organizationId: string
}

export function SegmentsClientWrapper({ swrFallback, organizationId }: SegmentsClientWrapperProps) {
  return (
    <SWRConfig value={{ fallback: swrFallback }}>
      <SegmentsClient organizationId={organizationId || undefined} />
    </SWRConfig>
  )
}
