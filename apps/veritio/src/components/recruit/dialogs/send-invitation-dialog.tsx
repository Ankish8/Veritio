'use client'

import { useState, useCallback, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Mail, Send, Tag, ExternalLink, CheckCircle2 } from 'lucide-react'
import { toast } from '@/components/ui/sonner'
import { useComposioStatus } from '@/hooks/use-composio-status'
import { useAuthFetch } from '@/hooks/use-auth-fetch'
import { formatIncentiveDisplay, type IncentiveDisplayConfig } from '@/lib/utils/format-incentive'

interface SendInvitationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  studyId: string
  studyTitle: string
  participantIds: string[]
  emailSubject: string
  emailBody: string
  participantUrl: string
  timeEstimate?: string
  incentiveConfig?: IncentiveDisplayConfig | null
  panelInviteTag?: string
  onSuccess?: (result: { invited: number; emailed: number }) => void
}

const EMAIL_TOOLKITS = [
  { value: 'gmail', label: 'Gmail' },
  { value: 'outlook', label: 'Outlook' },
]

export function SendInvitationDialog({
  open,
  onOpenChange,
  studyId,
  studyTitle,
  participantIds,
  emailSubject,
  emailBody,
  participantUrl,
  timeEstimate = '5-10 minutes',
  incentiveConfig,
  panelInviteTag,
  onSuccess,
}: SendInvitationDialogProps) {
  const [selectedToolkit, setSelectedToolkit] = useState<string>('gmail')
  const [isSending, setIsSending] = useState(false)

  const { isConfigured, isConnected, connect, isLoading: isLoadingStatus } = useComposioStatus()
  const authFetch = useAuthFetch()

  const toolkitConnected = isConnected(selectedToolkit)

  // Render email template with actual values
  const renderedSubject = useMemo(() => {
    const incentiveText = formatIncentiveDisplay(incentiveConfig) || ''
    return emailSubject
      .replace(/{study_name}/g, studyTitle || 'Untitled Study')
      .replace(/{link}/g, participantUrl)
      .replace(/{time_estimate}/g, timeEstimate)
      .replace(/{incentive}/g, incentiveText)
  }, [emailSubject, studyTitle, participantUrl, timeEstimate, incentiveConfig])

  const renderedBody = useMemo(() => {
    const incentiveText = formatIncentiveDisplay(incentiveConfig) || ''
    return emailBody
      .replace(/{study_name}/g, studyTitle || 'Untitled Study')
      .replace(/{link}/g, participantUrl)
      .replace(/{time_estimate}/g, timeEstimate)
      .replace(/{incentive}/g, incentiveText)
  }, [emailBody, studyTitle, participantUrl, timeEstimate, incentiveConfig])

  const handleSend = useCallback(async () => {
    if (participantIds.length === 0 || !toolkitConnected) return

    setIsSending(true)

    try {
      const response = await authFetch(`/api/studies/${studyId}/send-invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participant_ids: participantIds,
          toolkit: selectedToolkit,
          email_subject: renderedSubject,
          email_body: renderedBody,
          tag_name: panelInviteTag || undefined,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to send invitations' }))
        throw new Error(errorData.error || 'Failed to send invitations')
      }

      const result = await response.json()

      if (result.emailed > 0) {
        toast.success(`Sent ${result.emailed} invitation${result.emailed !== 1 ? 's' : ''}`, {
          description: [
            result.skipped > 0 ? `${result.skipped} already invited` : null,
            result.failed > 0 ? `${result.failed} failed to send` : null,
          ].filter(Boolean).join(', ') || undefined,
        })
      } else if (result.invited > 0) {
        toast.success(`Marked ${result.invited} participant${result.invited !== 1 ? 's' : ''} as invited`, {
          description: result.failed > 0 ? `${result.failed} emails failed to send` : undefined,
        })
      } else if (result.skipped > 0) {
        toast.info(`All ${result.skipped} participants were already invited`)
      }

      onSuccess?.(result)
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send invitations')
    } finally {
      setIsSending(false)
    }
  }, [participantIds, toolkitConnected, authFetch, studyId, selectedToolkit, renderedSubject, renderedBody, panelInviteTag, onSuccess, onOpenChange])

  const handleConnect = useCallback(async () => {
    try {
      await connect(selectedToolkit)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to connect')
    }
  }, [connect, selectedToolkit])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Send Invitations
          </DialogTitle>
          <DialogDescription>
            Send email invitations to {participantIds.length} participant{participantIds.length !== 1 ? 's' : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Email provider selection */}
          <div className="space-y-2">
            <Label>Send via</Label>
            <div className="flex items-center gap-3">
              <Select value={selectedToolkit} onValueChange={setSelectedToolkit}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EMAIL_TOOLKITS.map((tk) => (
                    <SelectItem key={tk.value} value={tk.value}>
                      <div className="flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5" />
                        {tk.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {isLoadingStatus ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : toolkitConnected ? (
                <Badge variant="secondary" className="gap-1 text-green-700 bg-green-50 border-green-200">
                  <CheckCircle2 className="h-3 w-3" />
                  Connected
                </Badge>
              ) : (
                <Button variant="outline" size="sm" onClick={handleConnect} className="gap-1.5">
                  <ExternalLink className="h-3.5 w-3.5" />
                  Connect {EMAIL_TOOLKITS.find((t) => t.value === selectedToolkit)?.label}
                </Button>
              )}
            </div>

            {!isConfigured && !isLoadingStatus && (
              <p className="text-xs text-muted-foreground">
                Email integrations are not configured. Contact your administrator to set up Composio.
              </p>
            )}
          </div>

          {/* Recipient count */}
          <div className="space-y-1">
            <Label className="text-muted-foreground">To</Label>
            <p className="text-sm font-medium">{participantIds.length} participant{participantIds.length !== 1 ? 's' : ''}</p>
          </div>

          {/* Email preview */}
          <div className="space-y-2">
            <Label>Email Preview</Label>
            <div className="rounded-lg border bg-muted/30 p-4 space-y-3 max-h-[250px] overflow-y-auto">
              <div>
                <span className="text-xs text-muted-foreground">Subject:</span>
                <p className="text-sm font-medium">{renderedSubject}</p>
              </div>
              <div className="border-t pt-3">
                <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed text-foreground/80">
                  {renderedBody}
                </pre>
              </div>
            </div>
          </div>

          {/* Study tag */}
          {panelInviteTag && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
              <Tag className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <p className="text-sm">
                  Tag: <span className="font-medium">{panelInviteTag}</span>
                </p>
                <p className="text-xs text-muted-foreground">Will be assigned to invited participants</p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={!toolkitConnected || participantIds.length === 0 || isSending}
          >
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Invitations
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
