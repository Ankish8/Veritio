'use client'

import { memo } from 'react'
import { cn } from '@/lib/utils'
import { useFloatingActionBar } from '@/components/analysis/shared/floating-action-bar/FloatingActionBarContext'
import type { BrandingTabProps } from '@/components/builders/shared/types'
import { LogoSection, ColorSection, StyleSection } from './sections'
import { BrandingPreview } from './preview'

function BrandingTabComponent({
  studyId,
  studyType: _studyType,
  isReadOnly,
}: BrandingTabProps) {
  const { activePanel } = useFloatingActionBar()
  const isAssistantOpen = activePanel === 'ai-assistant'

  return (
    <div className="flex-1 min-h-0 flex gap-6">
      {/* Left Side - Controls — expands when preview is hidden */}
      <div className={cn(
        "min-w-[280px] overflow-y-auto space-y-5 pr-2 transition-[width] duration-300 ease-in-out",
        isAssistantOpen ? "w-full" : "w-[30%]"
      )}>
        {/* Logo Section */}
        <LogoSection studyId={studyId} isReadOnly={isReadOnly} />

        {/* Divider */}
        <div className="border-t border-border" />

        {/* Brand Color Section */}
        <ColorSection studyId={studyId} isReadOnly={isReadOnly} />

        {/* Divider */}
        <div className="border-t border-border" />

        {/* Style & Appearance Section */}
        <StyleSection studyId={studyId} isReadOnly={isReadOnly} />
      </div>

      {/* Right Side - Live Preview — collapses when AI assistant is open */}
      <div className={cn(
        "hidden md:flex flex-col min-h-0 overflow-hidden",
        "transition-[flex,opacity] duration-300 ease-in-out",
        isAssistantOpen ? "flex-[0_0_0px] opacity-0" : "flex-1"
      )}>
        <BrandingPreview />
      </div>
    </div>
  )
}

export const BrandingTab = memo(
  BrandingTabComponent,
  (prev, next) =>
    prev.studyId === next.studyId &&
    prev.studyType === next.studyType &&
    prev.isReadOnly === next.isReadOnly &&
    prev.allowLogoUpload === next.allowLogoUpload &&
    prev.allowColorCustomization === next.allowColorCustomization
)
