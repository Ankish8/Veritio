'use client'

import { useState, useCallback, memo, useRef, useEffect } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Switch } from '@/components/ui/switch'
import { ChevronRight, ExternalLink, Link2, Info, QrCode, Download, Palette, RotateCcw, Settings, Users, UserPlus, Tag } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useStudyMetaStore } from '@/stores/study-meta-store'
import { useLocalInputSync } from '@/hooks/use-local-input-sync'
import { SelectParticipantsDialog, InviteSegmentDialog, SendInvitationDialog } from '../dialogs'
import type { IncentiveDisplayConfig } from '@/lib/utils/format-incentive'

interface RecruitSettingsPanelProps {
  participantUrl: string
  primaryColor: string
  logoUrl?: string
  isDraft: boolean
  studyId: string
  studyTitle: string
  hasEmailEnabled?: boolean
  emailSubject?: string
  emailBody?: string
  timeEstimate?: string
  incentiveConfig?: IncentiveDisplayConfig | null
}

/** Right-side panel for distribution settings (QR, Panel Invite, Redirects, UTM) */
export const RecruitSettingsPanel = memo(function RecruitSettingsPanel({
  participantUrl,
  primaryColor,
  logoUrl,
  isDraft,
  studyId,
  studyTitle,
  hasEmailEnabled,
  emailSubject = 'Help us improve - Take a quick survey',
  emailBody = '',
  timeEstimate,
  incentiveConfig,
}: RecruitSettingsPanelProps) {
  const { meta, updateRedirectSettings, updateSharingSettings } = useStudyMetaStore()

  const redirectSettings = meta?.sharingSettings?.redirects || {}
  const delay = redirectSettings.redirectDelay ?? 5

  // Local input sync for URL fields with debounce
  const completionUrl = useLocalInputSync(redirectSettings.completionUrl ?? '', {
    debounceMs: 500,
    onSync: (value) => updateRedirectSettings({ completionUrl: value || undefined }),
  })

  const screenoutUrl = useLocalInputSync(redirectSettings.screenoutUrl ?? '', {
    debounceMs: 500,
    onSync: (value) => updateRedirectSettings({ screenoutUrl: value || undefined }),
  })

  const quotaFullUrl = useLocalInputSync(redirectSettings.quotaFullUrl ?? '', {
    debounceMs: 500,
    onSync: (value) => updateRedirectSettings({ quotaFullUrl: value || undefined }),
  })

  const handleDelayChange = useCallback((value: number[]) => {
    updateRedirectSettings({ redirectDelay: value[0] })
  }, [updateRedirectSettings])

  return (
    <ScrollArea className="flex-1 h-full">
      <div className="p-4 space-y-6">
        {/* QR Code Section */}
        <QRCodeSection
          participantUrl={participantUrl}
          primaryColor={primaryColor}
          logoUrl={logoUrl}
          isDraft={isDraft}
        />

        {/* Divider */}
        <div className="border-t" />

        {/* Panel Invite Section */}
        <PanelInviteSection
          studyId={studyId}
          studyTitle={studyTitle}
          isDraft={isDraft}
          participantUrl={participantUrl}
          emailSubject={emailSubject}
          emailBody={emailBody}
          timeEstimate={timeEstimate}
          incentiveConfig={incentiveConfig}
        />

        {/* Divider */}
        <div className="border-t" />

        {/* Advanced Settings - Collapsible */}
        <Collapsible>
          <CollapsibleTrigger className="flex items-center gap-2 w-full text-left hover:bg-muted/50 -mx-2 px-2 py-1 rounded transition-colors">
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground transition-transform data-[state=open]:rotate-90" />
            <Settings className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Advanced Settings</span>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-4 space-y-6">
            {/* Panel Integration Section */}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold">Panel Integration</h3>
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <Label htmlFor="auto-add-panel" className="text-sm font-medium">
                    Auto-add to Panel
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically add participants who complete this study to your Panel.
                  </p>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <Switch
                          id="auto-add-panel"
                          checked={meta?.sharingSettings?.autoAddToPanel ?? true}
                          onCheckedChange={(checked) => updateSharingSettings({ autoAddToPanel: checked })}
                          disabled={!hasEmailEnabled}
                        />
                      </div>
                    </TooltipTrigger>
                    {!hasEmailEnabled && (
                      <TooltipContent side="left" className="max-w-[220px]">
                        <p className="text-xs">
                          Enable email collection in Study Flow &gt; Participant Details to use this feature.
                        </p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
              </div>
            </section>

            {/* Divider */}
            <div className="border-t" />

            {/* Redirect URLs Section */}
            <section className="space-y-4">
          <div className="flex items-center gap-2">
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Redirect URLs</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Configure where participants go after completing your study (Prolific, MTurk, etc.).
          </p>

          {/* Completion URL */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <Label htmlFor="panel-completion-url" className="text-sm font-medium">
                Completion URL
              </Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-[200px]">
                    <p className="text-xs">
                      Redirect after successful completion. Use your panel provider&apos;s completion URL.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input
              id="panel-completion-url"
              type="url"
              value={completionUrl.value}
              onChange={(e) => completionUrl.setValue(e.target.value)}
              onBlur={completionUrl.handleBlur}
              placeholder="https://..."
              className="h-8"
            />
          </div>

          {/* Screenout URL */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <Label htmlFor="panel-screenout-url" className="text-sm font-medium">
                Screenout URL
              </Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-[200px]">
                    <p className="text-xs">
                      Redirect if participant fails screening or doesn&apos;t qualify.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input
              id="panel-screenout-url"
              type="url"
              value={screenoutUrl.value}
              onChange={(e) => screenoutUrl.setValue(e.target.value)}
              onBlur={screenoutUrl.handleBlur}
              placeholder="https://..."
              className="h-8"
            />
          </div>

          {/* Quota Full URL */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <Label htmlFor="panel-quota-full-url" className="text-sm font-medium">
                Quota Full URL
              </Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-[200px]">
                    <p className="text-xs">
                      Redirect if study is at capacity or closed.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input
              id="panel-quota-full-url"
              type="url"
              value={quotaFullUrl.value}
              onChange={(e) => quotaFullUrl.setValue(e.target.value)}
              onBlur={quotaFullUrl.handleBlur}
              placeholder="https://..."
              className="h-8"
            />
          </div>

          {/* Redirect Delay Slider */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Redirect Delay</Label>
              <span className="text-sm text-muted-foreground">{delay}s</span>
            </div>
            <Slider
              value={[delay]}
              onValueChange={handleDelayChange}
              min={1}
              max={10}
              step={1}
              className="py-1"
            />
            <p className="text-sm text-muted-foreground">
              Time shown on thank you page before auto-redirect.
            </p>
          </div>
        </section>

        {/* Divider */}
        <div className="border-t" />

        {/* UTM Tracking Sub-section */}
        <section className="space-y-2">
          <div className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-muted-foreground" />
            <h4 className="text-sm font-medium">UTM Tracking</h4>
          </div>
          <p className="text-sm text-muted-foreground">
            Add UTM parameters to your study link to track traffic sources:
          </p>
          <code className="block text-xs bg-muted p-2 rounded overflow-x-auto font-mono break-all">
            ?utm_source=prolific&amp;utm_medium=panel&amp;utm_campaign=q1_study
          </code>
          <p className="text-sm text-muted-foreground">
            UTM parameters are automatically captured and shown in Analytics.
          </p>
        </section>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </ScrollArea>
  )
})

interface QRCodeSectionProps {
  participantUrl: string
  primaryColor: string
  logoUrl?: string
  isDraft: boolean
}

const QRCodeSection = memo(function QRCodeSection({
  participantUrl,
  primaryColor,
  logoUrl,
  isDraft,
}: QRCodeSectionProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [qrLoaded, setQrLoaded] = useState(false)
  const [customColor, setCustomColor] = useState<string | null>(null)
  const [popoverOpen, setPopoverOpen] = useState(false)

  const effectiveColor = customColor || primaryColor

  // Generate QR code when URL changes
  useEffect(() => {
    if (!participantUrl || isDraft) {
      setQrLoaded(false)
      if (containerRef.current) {
        containerRef.current.innerHTML = ''
      }
      return
    }

    let mounted = true

    import('qr-code-styling').then(({ default: QRCodeStyling }) => {
      if (!mounted) return

      const qrCode = new QRCodeStyling({
        width: 160,
        height: 160,
        type: 'canvas',
        data: participantUrl,
        dotsOptions: {
          color: effectiveColor,
          type: 'rounded',
        },
        backgroundOptions: {
          color: '#ffffff',
        },
        cornersSquareOptions: {
          color: effectiveColor,
          type: 'extra-rounded',
        },
        cornersDotOptions: {
          color: effectiveColor,
          type: 'dot',
        },
        imageOptions: {
          crossOrigin: 'anonymous',
          margin: 4,
        },
        ...(logoUrl && { image: logoUrl }),
      })

      if (containerRef.current && mounted) {
        containerRef.current.innerHTML = ''
        qrCode.append(containerRef.current)
        setQrLoaded(true)
      }
    }).catch(() => {
      if (mounted) setQrLoaded(false)
    })

    return () => {
      mounted = false
    }
  }, [participantUrl, isDraft, effectiveColor, logoUrl])

  const handleDownloadPNG = useCallback(async () => {
    if (!participantUrl || isDraft) return

    const { default: QRCodeStyling } = await import('qr-code-styling')
    const qrCode = new QRCodeStyling({
      width: 800,
      height: 800,
      type: 'canvas',
      data: participantUrl,
      dotsOptions: { color: effectiveColor, type: 'rounded' },
      backgroundOptions: { color: '#ffffff' },
      cornersSquareOptions: { color: effectiveColor, type: 'extra-rounded' },
      cornersDotOptions: { color: effectiveColor, type: 'dot' },
      imageOptions: { crossOrigin: 'anonymous', margin: 20 },
      ...(logoUrl && { image: logoUrl }),
    })

    qrCode.download({ name: 'study-qr-code', extension: 'png' })
  }, [participantUrl, isDraft, effectiveColor, logoUrl])

  const handleDownloadSVG = useCallback(async () => {
    if (!participantUrl || isDraft) return

    const { default: QRCodeStyling } = await import('qr-code-styling')
    const qrCode = new QRCodeStyling({
      width: 800,
      height: 800,
      type: 'svg',
      data: participantUrl,
      dotsOptions: { color: effectiveColor, type: 'rounded' },
      backgroundOptions: { color: '#ffffff' },
      cornersSquareOptions: { color: effectiveColor, type: 'extra-rounded' },
      cornersDotOptions: { color: effectiveColor, type: 'dot' },
      imageOptions: { crossOrigin: 'anonymous', margin: 20 },
      ...(logoUrl && { image: logoUrl }),
    })

    qrCode.download({ name: 'study-qr-code', extension: 'svg' })
  }, [participantUrl, isDraft, effectiveColor, logoUrl])

  const handleColorChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomColor(e.target.value)
  }, [])

  const handleResetColor = useCallback(() => {
    setCustomColor(null)
    setPopoverOpen(false)
  }, [])

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <QrCode className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">QR Code</h3>
      </div>
      <p className="text-sm text-muted-foreground">
        Download for physical distribution or print materials.
      </p>

      {isDraft ? (
        <div className="rounded-md bg-amber-50 border border-amber-200 p-2.5">
          <p className="text-sm text-amber-800">
            Launch your study to generate a QR code.
          </p>
        </div>
      ) : (
        <>
          {/* QR Code Display */}
          <div className="flex justify-center p-3 bg-white rounded-lg border">
            <div className="relative w-[160px] h-[160px]">
              <div ref={containerRef} className="w-full h-full" />
              {!qrLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted rounded">
                  <QrCode className="h-12 w-12 text-muted-foreground/30" />
                </div>
              )}
            </div>
          </div>

          {/* Download Buttons */}
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadPNG}
              disabled={!qrLoaded}
              className="flex-1 h-8"
            >
              <Download className="h-3.5 w-3.5 mr-1.5" />
              PNG
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadSVG}
              disabled={!qrLoaded}
              className="flex-1 h-8"
            >
              <Download className="h-3.5 w-3.5 mr-1.5" />
              SVG
            </Button>
            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <Palette className="h-3.5 w-3.5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56" align="end">
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="qr-color" className="text-xs">QR Code Color</Label>
                    <div className="flex gap-2">
                      <Input
                        id="qr-color"
                        type="color"
                        value={effectiveColor}
                        onChange={handleColorChange}
                        className="w-12 h-8 p-1 cursor-pointer"
                      />
                      <Input
                        type="text"
                        value={effectiveColor}
                        onChange={handleColorChange}
                        className="flex-1 font-mono text-xs h-8"
                        placeholder="#000000"
                      />
                    </div>
                  </div>
                  {customColor && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleResetColor}
                      className="w-full h-7 text-xs"
                    >
                      <RotateCcw className="h-3 w-3 mr-1.5" />
                      Reset to Brand Color
                    </Button>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            {customColor ? `Custom color (${effectiveColor})` : `Brand color (${primaryColor})`}
          </p>
        </>
      )}
    </section>
  )
})

interface PanelInviteSectionProps {
  studyId: string
  studyTitle: string
  isDraft: boolean
  participantUrl: string
  emailSubject: string
  emailBody: string
  timeEstimate?: string
  incentiveConfig?: IncentiveDisplayConfig | null
}

const PanelInviteSection = memo(function PanelInviteSection({
  studyId,
  studyTitle,
  isDraft,
  participantUrl,
  emailSubject,
  emailBody,
  timeEstimate,
  incentiveConfig,
}: PanelInviteSectionProps) {
  const { meta, updateSharingSettings } = useStudyMetaStore()

  const [selectParticipantsOpen, setSelectParticipantsOpen] = useState(false)
  const [inviteSegmentOpen, setInviteSegmentOpen] = useState(false)
  const [sendInvitationOpen, setSendInvitationOpen] = useState(false)
  const [pendingInviteIds, setPendingInviteIds] = useState<string[]>([])

  // Study tag — defaults to study title, persisted in sharing settings
  const panelInviteTag = useLocalInputSync(meta?.sharingSettings?.panelInviteTag ?? studyTitle, {
    debounceMs: 500,
    onSync: (value) => updateSharingSettings({ panelInviteTag: value || undefined }),
  })

  // When participants are selected (from either dialog), open the send invitation dialog
  const handleParticipantsSelected = useCallback((ids: string[]) => {
    setPendingInviteIds(ids)
    setSendInvitationOpen(true)
  }, [])

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Invite from Panel</h3>
      </div>
      <p className="text-sm text-muted-foreground">
        Invite participants from your panel to this study.
      </p>

      {isDraft ? (
        <div className="rounded-md bg-amber-50 border border-amber-200 p-2.5">
          <p className="text-sm text-amber-800">
            Launch your study to invite Panel participants.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Study Tag Input */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5 text-muted-foreground" />
              <Label htmlFor="panel-invite-tag" className="text-sm font-medium">
                Study Tag
              </Label>
            </div>
            <Input
              id="panel-invite-tag"
              value={panelInviteTag.value}
              onChange={(e) => panelInviteTag.setValue(e.target.value)}
              onBlur={panelInviteTag.handleBlur}
              placeholder={studyTitle}
              className="h-8"
            />
            <p className="text-xs text-muted-foreground">
              This tag will be assigned to invited participants.
            </p>
          </div>

          {/* Invite Buttons */}
          <div className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectParticipantsOpen(true)}
              className="w-full justify-start gap-2 h-9"
            >
              <UserPlus className="h-3.5 w-3.5" />
              Select Participants
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setInviteSegmentOpen(true)}
              className="w-full justify-start gap-2 h-9"
            >
              <Users className="h-3.5 w-3.5" />
              Invite Segment
            </Button>
          </div>

          <p className="text-sm text-muted-foreground pt-1">
            Participants will receive an email invitation and be tracked in your Panel dashboard.
          </p>
        </div>
      )}

      {/* Dialogs */}
      <SelectParticipantsDialog
        open={selectParticipantsOpen}
        onOpenChange={setSelectParticipantsOpen}
        studyId={studyId}
        studyTitle={studyTitle}
        onParticipantsSelected={handleParticipantsSelected}
      />
      <InviteSegmentDialog
        open={inviteSegmentOpen}
        onOpenChange={setInviteSegmentOpen}
        studyId={studyId}
        studyTitle={studyTitle}
        onParticipantsSelected={handleParticipantsSelected}
      />
      <SendInvitationDialog
        open={sendInvitationOpen}
        onOpenChange={setSendInvitationOpen}
        studyId={studyId}
        studyTitle={studyTitle}
        participantIds={pendingInviteIds}
        emailSubject={emailSubject}
        emailBody={emailBody}
        participantUrl={participantUrl}
        timeEstimate={timeEstimate}
        incentiveConfig={incentiveConfig}
        panelInviteTag={panelInviteTag.value || undefined}
      />
    </section>
  )
})
