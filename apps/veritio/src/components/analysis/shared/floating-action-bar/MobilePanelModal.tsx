'use client'

import { useFloatingActionBar, MOBILE_PANEL_MAX_WIDTH } from './FloatingActionBarContext'
import { useBreakpoint } from '@veritio/ui'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'

/**
 * Mobile panel modal that displays floating action bar panels as a bottom sheet on mobile devices.
 * This component should be rendered once at the dashboard layout level.
 *
 * On mobile (< 640px), when a panel is opened via openMobilePanel(), this sheet slides up
 * from the bottom displaying the panel content.
 */
export function MobilePanelModal() {
  const { width } = useBreakpoint()
  const {
    activePanel,
    isMobileModalOpen,
    setMobileModalOpen,
    getCustomPanel,
    closePanel,
    dynamicPanel,
  } = useFloatingActionBar()

  // Render wherever the docked side panel does not exist. Keying off the same
  // width as the layout closes the 640-767px gap, where the side panel was
  // already hidden but this sheet did not yet take over.
  if (width === undefined || width >= MOBILE_PANEL_MAX_WIDTH) return null

  // Get the panel content from registered actions or dynamic panel
  const customPanel = activePanel ? getCustomPanel(activePanel) : undefined
  const panelTitle = dynamicPanel?.title || customPanel?.panelTitle || 'Panel'
  const panelContent = dynamicPanel?.content || customPanel?.panelContent

  const handleOpenChange = (open: boolean) => {
    setMobileModalOpen(open)
    if (!open) {
      closePanel()
    }
  }

  return (
    <Sheet open={isMobileModalOpen} onOpenChange={handleOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[85vh] rounded-t-2xl flex flex-col"
        showCloseButton={true}
      >
        {/* Panels that draw their own header (participant detail) would
            otherwise get a second, generic one stacked above them. The title
            still has to exist for screen readers. */}
        <SheetHeader
          className={
            dynamicPanel?.hideHeader
              ? 'sr-only'
              : 'border-b pb-4 flex-shrink-0'
          }
        >
          <SheetTitle>{panelTitle}</SheetTitle>
        </SheetHeader>
        <ScrollArea className="flex-1 -mx-4">
          <div className="px-4 py-2">
            {panelContent}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
