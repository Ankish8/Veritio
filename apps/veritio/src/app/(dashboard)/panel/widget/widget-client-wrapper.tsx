'use client'

import { SWRConfig } from 'swr'
import { WidgetClient } from './widget-client'
import type { WidgetStudy } from './widget-client'

interface WidgetClientWithFallbackProps {
  studies: WidgetStudy[]
  swrFallback: Record<string, unknown>
  organizationId: string
}

export function WidgetClientWithFallback({ studies, swrFallback, organizationId }: WidgetClientWithFallbackProps) {
  return (
    <SWRConfig value={{ fallback: swrFallback }}>
      <WidgetClient studies={studies} organizationId={organizationId} />
    </SWRConfig>
  )
}
