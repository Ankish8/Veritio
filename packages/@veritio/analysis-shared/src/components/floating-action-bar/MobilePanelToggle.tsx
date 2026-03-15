'use client'

import { Info } from 'lucide-react'
import { Button } from '@veritio/ui/components/button'
import { useFloatingActionBar } from './FloatingActionBarContext'
import { useBreakpoint } from '../../hooks'

interface MobilePanelToggleProps {
  panelId?: string
  icon?: React.ComponentType<{ className?: string }>
  label?: string
}
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
