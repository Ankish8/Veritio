'use client'

import { memo, useState, lazy, Suspense, useEffect } from 'react'
import { useStudyMetaStore } from '@/stores/study-meta-store'
import { useFloatingActionBar } from '@/components/analysis/shared/floating-action-bar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Button } from '@/components/ui/button'
import { ChevronDown, Loader2, Monitor, Smartphone, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SharingTabProps } from '../types'
import { useTimeEstimate } from '@/hooks/use-time-estimate'
import { ParticipantLinkCard } from './sharing/participant-link-card'
import { QRCodeCard } from './sharing/qr-code-card'
import { EmailTemplateCard } from './sharing/email-template-card'
import { UrlParametersCard } from './sharing/url-parameters-card'
import { PublicResultsCard } from './sharing/public-results-card'
import { LinkAnalyticsCard } from './sharing/link-analytics-card'
import { WidgetAnalyticsCard } from './sharing/widget-analytics-card'

// Lazy load the widget card for better performance
const InterceptWidgetCard = lazy(() =>
  import('./sharing/intercept-widget-card').then((mod) => ({ default: mod.InterceptWidgetCard }))
)

type SharingSubTab = 'distribution' | 'widget' | 'analytics'

function SharingTabComponent({
  studyId,
  studyType,
  shareCode,
  urlSlug,
  isBuilder = true,
  isReadOnly = false,
  baseUrl,
}: SharingTabProps) {
  const { meta, updateRedirectSettings, updateInterceptSettings, updatePublicResultsSettings, setUrlSlug } =
    useStudyMetaStore()

  // Access floating action bar context to control panel visibility
  const { setActivePanel } = useFloatingActionBar()

  const timeEstimate = useTimeEstimate(studyType)
  const isDraft = meta.status === 'draft'
  const isLaunched = meta.status === 'active' || meta.status === 'paused' || meta.status === 'completed'

  // Determine the actual URL to use (prefer url_slug over share_code)
  const studyCode = urlSlug || meta.urlSlug || shareCode
  const participantUrl =
    typeof window !== 'undefined' && studyCode
      ? `${baseUrl || window.location.origin}/s/${studyCode}`
      : ''

  // Get branding for QR code and widget
  const primaryColor = meta.branding.primaryColor || '#000000'
  const logoUrl = meta.branding.logo?.url

  // Sub-tab state - default to distribution, or analytics if in results page
  const [activeSubTab, setActiveSubTab] = useState<SharingSubTab>('distribution')

  // Widget preview controls
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop')
  const [previewKey, setPreviewKey] = useState(0)

  // Show analytics tab only in results page when launched
  const showAnalyticsTab = !isBuilder && isLaunched

  // Control panel visibility based on active sub-tab
  // When widget sub-tab is active, open the widget settings panel
  // When any other sub-tab is active, close the panel
  useEffect(() => {
    if (activeSubTab === 'widget') {
      setActivePanel('builder-widget-settings')
    } else {
      setActivePanel(null)
    }
  }, [activeSubTab, setActivePanel])

  return (
    <div className="flex-1 min-h-0 overflow-x-hidden flex flex-col">
      <Tabs value={activeSubTab} onValueChange={(v) => setActiveSubTab(v as SharingSubTab)} className="flex-1 flex flex-col min-h-0">
        {/* Sub-tabs header - sticky */}
        <div className="sticky top-0 z-10 bg-background pb-4 -mx-6 px-6 pt-1 border-b border-transparent [&:not(:first-child)]:border-border flex-shrink-0">
          <div className="flex items-center justify-between">
            <TabsList variant="underline">
              <TabsTrigger variant="underline" value="distribution">
                Distribution
              </TabsTrigger>
              <TabsTrigger variant="underline" value="widget">
                Widget
              </TabsTrigger>
              {showAnalyticsTab && (
                <TabsTrigger variant="underline" value="analytics">
                  Analytics
                </TabsTrigger>
              )}
            </TabsList>

            {/* Widget preview controls - only visible on widget tab */}
            {activeSubTab === 'widget' && !isDraft && (
              <div className="flex items-center gap-2">
                {/* Trigger Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPreviewKey((prev) => prev + 1)}
                  className="h-8 gap-2"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Trigger
                </Button>

                {/* Device Toggle */}
                <div className="flex items-center gap-1 p-0.5 bg-background rounded-md shadow-sm border border-border">
                  <button
                    type="button"
                    onClick={() => setPreviewDevice('desktop')}
                    title="Desktop"
                    aria-label="Desktop"
                    className={cn(
                      'p-2 rounded transition-colors',
                      previewDevice === 'desktop' ? 'bg-muted shadow-sm' : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Monitor className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewDevice('mobile')}
                    title="Mobile"
                    aria-label="Mobile"
                    className={cn(
                      'p-2 rounded transition-colors',
                      previewDevice === 'mobile' ? 'bg-muted shadow-sm' : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Smartphone className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Distribution Tab Content */}
        <TabsContent value="distribution" className="mt-0 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6">
              <ParticipantLinkCard
                participantUrl={participantUrl}
                studyCode={studyCode || ''}
                urlSlug={urlSlug || meta.urlSlug}
                onUrlSlugChange={setUrlSlug}
                isDraft={isDraft}
                isReadOnly={isReadOnly}
              />

              <QRCodeCard
                participantUrl={participantUrl}
                isDraft={isDraft}
                isReadOnly={isReadOnly}
                primaryColor={primaryColor}
                logoUrl={logoUrl}
              />
            </div>

            <div className="space-y-6">
              <EmailTemplateCard
                studyTitle={meta.title}
                participantUrl={participantUrl}
                isDraft={isDraft}
                isReadOnly={isReadOnly}
                timeEstimate={timeEstimate}
              />

              {/* Collapsible Redirect URLs */}
              <Collapsible defaultOpen={false}>
                <div className="border rounded-lg">
                  <CollapsibleTrigger className="w-full px-6 py-4 flex items-center justify-between hover:bg-muted/50 transition-colors rounded-t-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-semibold">Redirect URLs</span>
                      <span className="text-sm text-muted-foreground font-normal">
                        (Optional panel integration)
                      </span>
                    </div>
                    <ChevronDown className="h-4 w-4 transition-transform duration-200 [&[data-state=open]]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="px-6 pb-4 data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                    <UrlParametersCard
                      redirectSettings={meta.sharingSettings.redirects}
                      onRedirectSettingsChange={updateRedirectSettings}
                      isDraft={isDraft}
                      isReadOnly={isReadOnly}
                    />
                  </CollapsibleContent>
                </div>
              </Collapsible>
            </div>
          </div>
        </TabsContent>

        {/* Widget Tab Content - Full Width with lazy loading */}
        <TabsContent value="widget" className="mt-0 flex-1 overflow-y-auto overflow-x-hidden">
          <Suspense
            fallback={
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            }
          >
            <InterceptWidgetCard
              interceptSettings={meta.sharingSettings.intercept}
              onInterceptSettingsChange={updateInterceptSettings}
              participantUrl={participantUrl}
              isDraft={isDraft}
              isReadOnly={isReadOnly}
              primaryColor={primaryColor}
              studyType={studyType}
              previewDevice={previewDevice}
              previewKey={previewKey}
            />
          </Suspense>
        </TabsContent>

        {/* Analytics Tab Content (only in results page when launched) */}
        {showAnalyticsTab && (
          <TabsContent value="analytics" className="mt-0">
            <div className="space-y-6">
              {/* Public Results Card */}
              <PublicResultsCard
                studyId={studyId}
                publicResultsSettings={meta.sharingSettings.publicResults}
                onPublicResultsSettingsChange={updatePublicResultsSettings}
                isReadOnly={isReadOnly}
              />

              <LinkAnalyticsCard studyId={studyId} />

              {/* Widget Analytics (only if widget is enabled) */}
              {meta.sharingSettings.intercept?.enabled && (
                <WidgetAnalyticsCard studyId={studyId} />
              )}
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}

export const SharingTab = memo(
  SharingTabComponent,
  (prev, next) =>
    prev.studyId === next.studyId &&
    prev.studyType === next.studyType &&
    prev.shareCode === next.shareCode &&
    prev.urlSlug === next.urlSlug &&
    prev.isBuilder === next.isBuilder &&
    prev.isReadOnly === next.isReadOnly &&
    prev.baseUrl === next.baseUrl
)
