'use client'

import { Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useFloatingActionBar } from './FloatingActionBarContext'
import { useBreakpoint } from '@veritio/ui'

interface MobilePanelToggleProps {
  /** Panel ID to open (default: 'study-info') */
  panelId?: string
  /** Custom icon component */
  icon?: React.ComponentType<{ className?: string }>
  /** Accessible label */
  label?: string
}

/**
 * Toggle button for opening floating action bar panels on mobile devices.
 * Only renders on mobile (< 640px). Opens the specified panel in the mobile modal.
 *
 * @example
 * // In header
 * <MobilePanelToggle panelId="study-info" />
 */
export function MobilePanelToggle({
  panelId = 'study-info',
  icon: Icon = Info,
  label = 'Open panel',
}: MobilePanelToggleProps) {
  const { isMobile } = useBreakpoint()
  const { openMobilePanel } = useFloatingActionBar()

  // Only render on mobile
  if (!isMobile) return null

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={() => openMobilePanel(panelId)}
      aria-label={label}
    >
      <Icon className="h-4 w-4" />
    </Button>
  )
}
