'use client'

/**
 * Wrapper that seeds SWR cache with server-prefetched participant data.
 * Eliminates initial Motia API calls (~1000ms each) by providing
 * data directly from the server component.
 */

import { SWRConfig } from 'swr'
import { ParticipantsClient } from './participants-client'

interface ParticipantsClientWrapperProps {
  swrFallback: Record<string, unknown>
  organizationId: string
}

export function ParticipantsClientWrapper({ swrFallback, organizationId }: ParticipantsClientWrapperProps) {
  return (
    <SWRConfig value={{ fallback: swrFallback }}>
      <ParticipantsClient organizationId={organizationId || undefined} />
    </SWRConfig>
  )
}
