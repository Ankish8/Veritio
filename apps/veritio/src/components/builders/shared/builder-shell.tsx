'use client'

import { useCallback, useMemo, useState, Suspense } from 'react'
import Link from 'next/link'
import { Loader2, Eye, Rocket, Copy, ArrowRight, EyeOff } from 'lucide-react'
import { toast } from '@/components/ui/sonner'

import { Header } from '@/components/dashboard/header'
import { StudyNavigationHeader } from '@/components/dashboard/study-navigation-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList } from '@/components/ui/tabs'
import { YjsProvider, useYjsOptional, CollaborativeAvatars, SyncStatusIndicator, TabPresenceSync, TabTriggerWithPresence } from '@/components/yjs'
import { useYjsMetaSync } from '@veritio/prototype-test/hooks'

import { AutoSaveStatus } from '@/components/builders/save-status'
import { useStudyMetaStore } from '@/stores/study-meta-store'
import { useBuilderShellSave } from '@/hooks/use-builder-shell-save'
import type { BuilderShellProps, BuilderTabId } from './types'

/** Runs useYjsMetaSync inside the YjsProvider tree — covers Settings, Branding, Sharing tabs. */
function YjsMetaSyncBridge() {
  const yjs = useYjsOptional()
  useYjsMetaSync({
    doc: yjs?.doc ?? null,
    isSynced: yjs?.isSynced ?? false,
    enabled: !!yjs?.doc,
  })
  return null
}

function TabLoadingFallback() {
  return (
    <div className="flex-1 flex items-center justify-center min-h-[200px]">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  )
}

export function BuilderShell({
  studyId,
  studyType: _studyType,
  studyTitle,
  projectId,
  projectName,
  shareCode,
  tabs,
  activeTab,
  onTabChange,
  onSave,
  isDirty: contentDirty,
  saveStatus: contentSaveStatus,
  lastSavedAt: contentLastSavedAt,
  isStoreHydrated = true,
  onPreviewClick,
  onLaunchClick,
  isLaunching,
  studyStatus,
  isRefreshingContent,
  isReadOnly,
}: BuilderShellProps) {
  const [copied, setCopied] = useState(false)
  const meta = useStudyMetaStore((s) => s.meta)

  const { isDirty, saveStatus, lastSavedAt, isSaving, handleManualSave } = useBuilderShellSave({
    studyId,
    onSave,
    contentDirty,
    contentSaveStatus,
    contentLastSavedAt,
    isStoreHydrated,
    isRefreshingContent,
    isReadOnly,
  })

  const studyCode = meta.urlSlug || shareCode
  const shareUrl =
    typeof window !== 'undefined' && studyCode ? `${window.location.origin}/s/${studyCode}` : ''

  const handleCopyLink = async () => {
    if (!shareUrl) {
      toast.error('Share link not available', {
        description: 'Please refresh the page and try again.',
      })
      return
    }
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    toast.success('Link copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  const isLaunched = studyStatus && studyStatus !== 'draft'
  const displayTitle = meta.title || studyTitle

  const handleTabChangeWithTransition = useCallback((newTab: BuilderTabId) => {
    if (typeof document !== 'undefined' && 'startViewTransition' in document) {
      ;(document as { startViewTransition: (cb: () => void) => void }).startViewTransition(() => {
        onTabChange(newTab)
      })
      return
    }
    onTabChange(newTab)
  }, [onTabChange])

  const nextTab = useMemo(() => {
    const currentIndex = tabs.findIndex((t) => t.id === activeTab)
    if (currentIndex < 0 || currentIndex >= tabs.length - 1) return null
    return tabs[currentIndex + 1]
  }, [tabs, activeTab])

  return (
    <YjsProvider studyId={studyId}>
      <YjsMetaSyncBridge />
      <TabPresenceSync activeTab={activeTab} />

      <Header
        leftContent={
          <StudyNavigationHeader
            projectId={projectId}
            projectName={projectName}
            studyId={studyId}
            studyTitle={displayTitle}
            studyStatus={studyStatus || 'draft'}
          />
        }
      >
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 mr-2">
            <SyncStatusIndicator size="sm" showUserCount={false} />
            <CollaborativeAvatars maxVisible={3} size="sm" />
          </div>

          {isReadOnly ? (
            <Badge variant="secondary" className="gap-1.5">
              <EyeOff className="h-3 w-3" />
              View Only
            </Badge>
          ) : (
            <>
              <AutoSaveStatus
                isDirty={isDirty}
                status={saveStatus}
                lastSavedAt={lastSavedAt}
                onSaveNow={isDirty && !isSaving ? handleManualSave : undefined}
              />

              {isLaunched && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={handleCopyLink}
                  title={copied ? 'Copied!' : 'Copy Link'}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              )}
            </>
          )}

          {onPreviewClick ? (
            <Button variant="outline" size="sm" onClick={onPreviewClick}>
              <Eye className="mr-2 h-4 w-4" />
              Preview
            </Button>
          ) : (
            <Button asChild variant="outline" size="sm">
              <Link href={`/projects/${projectId}/studies/${studyId}/preview`} target="_blank">
                <Eye className="mr-2 h-4 w-4" />
                Preview
              </Link>
            </Button>
          )}

          {!isReadOnly && studyStatus === 'draft' && onLaunchClick && (
            <Button size="sm" onClick={onLaunchClick} disabled={isLaunching}>
              {isLaunching ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Rocket className="mr-2 h-4 w-4" />
              )}
              {isLaunching ? 'Launching...' : 'Launch'}
            </Button>
          )}
        </div>
      </Header>

      <div className="flex flex-1 flex-col min-h-0 p-3 sm:p-4 lg:p-6">
        <Tabs
          value={activeTab}
          onValueChange={(value) => handleTabChangeWithTransition(value as BuilderTabId)}
          className="flex flex-1 flex-col min-h-0"
        >
          <TabsList variant="underline" className="mb-2 w-full overflow-x-auto flex-nowrap">
            {tabs.map((tab) => (
              <TabTriggerWithPresence
                key={tab.id}
                tabId={tab.id}
                activeTab={activeTab}
                icon={tab.icon}
                label={tab.label}
                badge={tab.badge}
                disabled={tab.disabled}
              />
            ))}
          </TabsList>

          <div className="relative flex-1 flex flex-col min-h-0" inert={isReadOnly || undefined}>
            {tabs.map((tab) => (
              <TabsContent
                key={tab.id}
                value={tab.id}
                className="flex-1 mt-0 flex flex-col min-h-0"
                keepMounted={tab.keepMounted}
              >
                <Suspense fallback={<TabLoadingFallback />}>
                  {tab.component}
                </Suspense>
              </TabsContent>
            ))}

            {/* AI content refresh overlay — subtle frost + indeterminate progress bar */}
            {isRefreshingContent && (
              <div className="absolute inset-0 z-20 bg-background/40 animate-in fade-in duration-150 pointer-events-none">
                <div className="absolute top-0 left-0 right-0 h-0.5 overflow-hidden">
                  <div className="h-full w-1/3 bg-primary/60 rounded-full animate-[shimmer-bar_1.2s_ease-in-out_infinite]" />
                </div>
              </div>
            )}
          </div>

          {nextTab && activeTab !== 'study-flow' && (
            <div className="flex-shrink-0 flex items-center justify-end border-t pt-4 mt-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full sm:w-auto"
                onClick={() => handleTabChangeWithTransition(nextTab.id)}
              >
                Continue to {nextTab.label}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}
        </Tabs>
      </div>
    </YjsProvider>
  )
}
