/**
 * Panel > Widget Page
 *
 * Global widget configuration page.
 * Allows users to select which study the widget should promote
 * and configure all widget settings.
 */

import { Suspense } from 'react'
import { WidgetPageContent } from './widget-page-content'
import { PanelPageSkeleton } from '@/components/dashboard/skeletons'

export const dynamic = 'force-dynamic'

export default async function WidgetPage() {
  return (
    <Suspense fallback={<PanelPageSkeleton />}>
      <WidgetPageContent />
    </Suspense>
  )
}
