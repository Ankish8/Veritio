'use client'

import { memo, useState, useCallback } from 'react'
import useSWR from 'swr'
import { useCurrentOrganizationId } from '@/stores/collaboration-store'
import { format, formatDistanceToNow } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Gift,
  DollarSign,
  CheckCircle2,
  Clock,
  Send,
  AlertCircle,
  XCircle,
  Loader2,
} from 'lucide-react'
import { toast } from '@/components/ui/sonner'
import { useAuthFetch } from '@/hooks/use-auth-fetch'

import type { PanelIncentiveDistributionWithDetails, IncentiveStatus } from '@/lib/supabase/panel-types'

interface ParticipantIncentivesTabProps {
  participantId: string
}

const STATUS_CONFIG: Record<IncentiveStatus, { icon: React.ReactNode; label: string; color: string }> = {
  promised: {
    icon: <Clock className="h-4 w-4" />,
    label: 'Promised',
    color: 'text-muted-foreground bg-muted',
  },
  pending: {
    icon: <Clock className="h-4 w-4" />,
    label: 'Pending',
    color: 'text-yellow-600 bg-yellow-50',
  },
  sent: {
    icon: <Send className="h-4 w-4" />,
    label: 'Sent',
    color: 'text-blue-600 bg-blue-50',
  },
  redeemed: {
    icon: <CheckCircle2 className="h-4 w-4" />,
    label: 'Redeemed',
    color: 'text-green-600 bg-green-50',
  },
  failed: {
    icon: <AlertCircle className="h-4 w-4" />,
    label: 'Failed',
    color: 'text-red-600 bg-red-50',
  },
  cancelled: {
    icon: <XCircle className="h-4 w-4" />,
    label: 'Cancelled',
    color: 'text-muted-foreground bg-muted',
  },
}

export const ParticipantIncentivesTab = memo(function ParticipantIncentivesTab({
  participantId,
}: ParticipantIncentivesTabProps) {
  const authFetch = useAuthFetch()
  const organizationId = useCurrentOrganizationId()
  const [markingSent, setMarkingSent] = useState<string | null>(null)
  const [showMarkSentDialog, setShowMarkSentDialog] = useState(false)
  const [selectedDistribution, setSelectedDistribution] = useState<PanelIncentiveDistributionWithDetails | null>(null)
  const [fulfillmentMethod, setFulfillmentMethod] = useState('')
  const [fulfillmentReference, setFulfillmentReference] = useState('')
  const [notes, setNotes] = useState('')

  // Fetch incentive distributions for this participant
  const { data: distributions, isLoading, mutate } = useSWR<PanelIncentiveDistributionWithDetails[]>(
    participantId && organizationId ? `/api/panel/participants/${participantId}/incentives?organizationId=${organizationId}` : null
  )

  const handleMarkAsSent = useCallback((distribution: PanelIncentiveDistributionWithDetails) => {
    setSelectedDistribution(distribution)
    setFulfillmentMethod('')
    setFulfillmentReference('')
    setNotes('')
    setShowMarkSentDialog(true)
  }, [])

  const confirmMarkAsSent = useCallback(async () => {
    if (!selectedDistribution || !fulfillmentMethod.trim()) return

    setMarkingSent(selectedDistribution.id)
    try {
      const response = await authFetch(`/api/panel/incentives/${selectedDistribution.id}?organizationId=${organizationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'sent',
          fulfillment_method: fulfillmentMethod.trim(),
          fulfillment_reference: fulfillmentReference.trim() || null,
          notes: notes.trim() || null,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update incentive')
      }

      toast.success('Incentive marked as sent')
      mutate()
      setShowMarkSentDialog(false)
    } catch {
      toast.error('Failed to mark as sent')
    } finally {
      setMarkingSent(null)
    }
  }, [selectedDistribution, fulfillmentMethod, fulfillmentReference, notes, authFetch, mutate, organizationId])

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 rounded-lg" />
        {[...Array(2)].map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>
    )
  }

  // Calculate totals
  const totalEarned = distributions?.reduce((sum, d) => {
    if (d.status === 'sent' || d.status === 'redeemed') {
      return sum + d.amount
    }
    return sum
  }, 0) || 0

  const pendingAmount = distributions?.reduce((sum, d) => {
    if (d.status === 'pending' || d.status === 'promised') {
      return sum + d.amount
    }
    return sum
  }, 0) || 0

  const pendingCount = distributions?.filter(d => d.status === 'pending' || d.status === 'promised').length || 0

  if (!distributions || distributions.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Gift className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-medium mb-1">No Incentives</h3>
          <p className="text-sm text-muted-foreground">
            This participant hasn&apos;t earned any incentives yet.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-100 p-2">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">${totalEarned.toFixed(2)}</p>
                <p className="text-sm text-muted-foreground">Total Earned</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-yellow-100 p-2">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-600">${pendingAmount.toFixed(2)}</p>
                <p className="text-sm text-muted-foreground">{pendingCount} Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <Gift className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{distributions.length}</p>
                <p className="text-sm text-muted-foreground">Total Incentives</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Incentive List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">Incentive History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {distributions.map((distribution) => {
              const statusConfig = STATUS_CONFIG[distribution.status]
              const isPending = distribution.status === 'pending' || distribution.status === 'promised'

              return (
                <div key={distribution.id} className="flex items-center justify-between p-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">${distribution.amount.toFixed(2)}</span>
                      <Badge variant="outline" className="text-xs">
                        {distribution.currency}
                      </Badge>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig.color}`}>
                        {statusConfig.icon}
                        {statusConfig.label}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {distribution.study.title}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span>Created {formatDistanceToNow(new Date(distribution.created_at), { addSuffix: true })}</span>
                      {distribution.sent_at && (
                        <span>Sent {format(new Date(distribution.sent_at), 'MMM d, yyyy')}</span>
                      )}
                      {distribution.fulfillment_method && (
                        <span>via {distribution.fulfillment_method}</span>
                      )}
                    </div>
                  </div>

                  {isPending && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleMarkAsSent(distribution)}
                      disabled={markingSent === distribution.id}
                    >
                      {markingSent === distribution.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Send className="h-3.5 w-3.5 mr-1.5" />
                          Mark Sent
                        </>
                      )}
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Mark as Sent Dialog */}
      <Dialog open={showMarkSentDialog} onOpenChange={setShowMarkSentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Incentive as Sent</DialogTitle>
            <DialogDescription>
              Record the fulfillment details for this ${selectedDistribution?.amount.toFixed(2)} incentive.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="fulfillment-method">Fulfillment Method *</Label>
              <Input
                id="fulfillment-method"
                placeholder="e.g., Amazon Gift Card, PayPal, Visa Gift Card"
                value={fulfillmentMethod}
                onChange={(e) => setFulfillmentMethod(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fulfillment-reference">Reference / Order ID</Label>
              <Input
                id="fulfillment-reference"
                placeholder="e.g., Order #12345"
                value={fulfillmentReference}
                onChange={(e) => setFulfillmentReference(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Any additional notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMarkSentDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={confirmMarkAsSent}
              disabled={!fulfillmentMethod.trim() || markingSent !== null}
            >
              {markingSent ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Mark as Sent
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
})
