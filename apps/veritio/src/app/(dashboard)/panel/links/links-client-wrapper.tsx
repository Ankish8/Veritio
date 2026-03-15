'use client'

import { SWRConfig } from 'swr'
import { LinksClient } from './links-client'

interface LinksClientWrapperProps {
  swrFallback: Record<string, unknown>
}

export function LinksClientWrapper({ swrFallback }: LinksClientWrapperProps) {
  return (
    <SWRConfig value={{ fallback: swrFallback }}>
      <LinksClient />
    </SWRConfig>
  )
}
