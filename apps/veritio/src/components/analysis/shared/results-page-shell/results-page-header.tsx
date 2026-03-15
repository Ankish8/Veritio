'use client'

/**
 * ResultsPageHeader
 *
 * Header component for results pages with breadcrumbs, status indicator,
 * and responsive action buttons (mobile dropdown, tablet icons, desktop full).
 */

import { useState } from 'react'
import { Flag, Copy, MoreHorizontal } from 'lucide-react'
import { toast } from '@/components/ui/sonner'

import { Header } from '@/components/dashboard/header'
import { StudyNavigationHeader } from '@/components/dashboard/study-navigation-header'
import { Button } from '@/components/ui/button'
import { EndStudyDialog } from '@/components/ui/confirm-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MobilePanelToggle } from '@/components/analysis/shared/floating-action-bar'
import { CollaborativeAvatars, SyncStatusIndicator } from '@/components/yjs'

export interface ResultsPageHeaderProps {
  projectId: string
  projectName: string
  studyId: string
  studyTitle: string
  studyStatus: string
  shareCode: string
  onEndStudy: () => Promise<void>
}

export function ResultsPageHeader({
  projectId,
  projectName,
  studyId,
  studyTitle,
  studyStatus,
  shareCode,
  onEndStudy,
}: ResultsPageHeaderProps) {
  const [endDialogOpen, setEndDialogOpen] = useState(false)
  const [isEnding, setIsEnding] = useState(false)
  const [copied, setCopied] = useState(false)

  const shareUrl =
    typeof window !== 'undefined' ? `${window.location.origin}/s/${shareCode}` : ''

  const handleEnd = async () => {
    setIsEnding(true)
    try {
      await onEndStudy()
      toast.success('Study ended', {
        description: 'The study has been completed and is no longer accepting participants.',
      })
      setEndDialogOpen(false)
    } catch {
      toast.error('Failed to end study')
    } finally {
      setIsEnding(false)
    }
  }

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      <Header
        leftContent={
          <StudyNavigationHeader
            projectId={projectId}
            projectName={projectName}
            studyId={studyId}
            studyTitle={studyTitle}
            studyStatus={studyStatus as 'draft' | 'active' | 'paused' | 'completed'}
          />
        }
      >
        {/* Mobile: Panel toggle + dropdown menu */}
        <div className="flex sm:hidden items-center gap-1">
          <MobilePanelToggle panelId="study-info" label="Open study info" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {studyStatus !== 'draft' && (
                <DropdownMenuItem onClick={handleCopyLink}>
                  <Copy className="mr-2 h-4 w-4" />
                  {copied ? 'Copied!' : 'Copy Link'}
                </DropdownMenuItem>
              )}
              {studyStatus === 'active' && (
                <DropdownMenuItem onClick={() => setEndDialogOpen(true)}>
                  <Flag className="mr-2 h-4 w-4" />
                  End Study
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Tablet: Icon-only buttons */}
        <div className="hidden sm:flex lg:hidden items-center gap-1">
          {/* Real-time presence indicators */}
          <div className="flex items-center gap-1 mr-1">
            <SyncStatusIndicator size="sm" showUserCount={false} />
            <CollaborativeAvatars maxVisible={2} size="sm" />
          </div>

          {studyStatus !== 'draft' && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleCopyLink}
              title={copied ? 'Copied!' : 'Copy Link'}
            >
              <Copy className="h-4 w-4" />
            </Button>
          )}
          {studyStatus === 'active' && (
            <Button size="icon-sm" onClick={() => setEndDialogOpen(true)} title="End Study">
              <Flag className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Desktop: Subtle icon buttons */}
        <div className="hidden lg:flex items-center gap-2">
          {/* Real-time presence indicators */}
          <div className="flex items-center gap-2 mr-2">
            <SyncStatusIndicator size="sm" showUserCount={false} />
            <CollaborativeAvatars maxVisible={3} size="sm" />
          </div>

          {studyStatus !== 'draft' && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleCopyLink}
              title={copied ? 'Copied!' : 'Copy Link'}
            >
              <Copy className="h-4 w-4" />
            </Button>
          )}
          {studyStatus === 'active' && (
            <Button size="sm" onClick={() => setEndDialogOpen(true)}>
              <Flag className="mr-2 h-4 w-4" />
              End Study
            </Button>
          )}
        </div>
      </Header>

      <EndStudyDialog
        open={endDialogOpen}
        onOpenChange={setEndDialogOpen}
        onConfirm={handleEnd}
        loading={isEnding}
      />
    </>
  )
}
