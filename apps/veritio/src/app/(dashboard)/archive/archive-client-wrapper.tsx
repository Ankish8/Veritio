'use client'

import { SWRConfig } from 'swr'
import { Header } from '@/components/dashboard/header'
import { ArchiveClient } from './archive-client'

interface ArchiveClientWrapperProps {
  swrFallback: Record<string, unknown>
}

export function ArchiveClientWrapper({ swrFallback }: ArchiveClientWrapperProps) {
  return (
    <SWRConfig value={{ fallback: swrFallback }}>
      <Header title="Archive" />
      <ArchiveClient />
    </SWRConfig>
  )
}
