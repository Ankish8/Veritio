'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Users, Send, CheckCircle } from 'lucide-react'
import { toast } from '@/components/ui/sonner'
import { cn } from '@/lib/utils'

interface PanelInviteCardProps {
  studyId?: string
  studyTitle: string
  isDraft?: boolean
  className?: string
}

export function PanelInviteCard({ studyTitle, isDraft, className }: PanelInviteCardProps) {
  const [isInviting] = useState(false)
  const [invitedCount] = useState(0)

  const handleOpenPanelSelector = useCallback(() => {
    // TODO: Open dialog to select Panel participants
    toast.info('Panel participant selector coming soon')
  }, [])

  const handleInviteSegment = useCallback(() => {
    // TODO: Open dialog to select segment and invite all
    toast.info('Segment invitation coming soon')
  }, [])

  if (isDraft) {
    return (
      <Card className={cn('border-dashed bg-muted/30', className)}>
        <CardContent className="flex items-center justify-center p-8 text-center">
          <div>
            <Users className="h-8 w-8 mx-auto mb-3 opacity-50 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Launch your study to invite Panel participants
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('border-purple-100 bg-gradient-to-br from-purple-50/30 to-white', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-purple-600" />
            <CardTitle className="text-base">Invite from Panel</CardTitle>
          </div>
          {invitedCount > 0 && (
            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
              <CheckCircle className="h-3 w-3 mr-1" />
              {invitedCount} invited
            </Badge>
          )}
        </div>
        <CardDescription>
          Invite participants from your panel to participate in this study
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Button
            variant="outline"
            className="justify-start gap-2 h-auto py-3 px-4"
            onClick={handleOpenPanelSelector}
            disabled={isInviting}
          >
            <div className="flex flex-col items-start gap-1 flex-1">
              <div className="font-medium text-sm">Select Participants</div>
              <div className="text-xs text-muted-foreground">
                Choose specific participants to invite
              </div>
            </div>
            <Send className="h-4 w-4 text-purple-600" />
          </Button>

          <Button
            variant="outline"
            className="justify-start gap-2 h-auto py-3 px-4"
            onClick={handleInviteSegment}
            disabled={isInviting}
          >
            <div className="flex flex-col items-start gap-1 flex-1">
              <div className="font-medium text-sm">Invite Segment</div>
              <div className="text-xs text-muted-foreground">
                Invite all participants from a segment
              </div>
            </div>
            <Send className="h-4 w-4 text-violet-600" />
          </Button>
        </div>

        <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
          <p>
            💡 <strong className="font-medium text-foreground">Tip:</strong> Panel participants will
            receive an invitation to participate in "{studyTitle}" and their progress will be tracked in
            your Panel dashboard.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
