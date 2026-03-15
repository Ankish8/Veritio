'use client'

import { useState, useCallback, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Send, Loader2 } from 'lucide-react'

interface MarkSentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Number of items being marked (for bulk mode) */
  itemCount?: number
  /** Amount for single item mode */
  amount?: number
  /** Currency for single item mode */
  currency?: string
  /** Called when user confirms */
  onConfirm: (data: {
    fulfillment_method: string
    fulfillment_reference?: string
    notes?: string
  }) => Promise<void>
}

export function MarkSentDialog({
  open,
  onOpenChange,
  itemCount,
  amount,
  currency,
  onConfirm,
}: MarkSentDialogProps) {
  const [fulfillmentMethod, setFulfillmentMethod] = useState('')
  const [fulfillmentReference, setFulfillmentReference] = useState('')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isBulkMode = itemCount !== undefined && itemCount > 0

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setFulfillmentMethod('')
      setFulfillmentReference('')
      setNotes('')
    }
  }, [open])

  const handleConfirm = useCallback(async () => {
    if (!fulfillmentMethod.trim()) return

    setIsSubmitting(true)
    try {
      await onConfirm({
        fulfillment_method: fulfillmentMethod.trim(),
        fulfillment_reference: fulfillmentReference.trim() || undefined,
        notes: notes.trim() || undefined,
      })
      onOpenChange(false)
    } finally {
      setIsSubmitting(false)
    }
  }, [fulfillmentMethod, fulfillmentReference, notes, onConfirm, onOpenChange])

  // Format currency for display
  const formatCurrency = (amt: number, curr: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: curr || 'USD',
    }).format(amt)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mark Incentive{isBulkMode ? 's' : ''} as Sent</DialogTitle>
          <DialogDescription>
            {isBulkMode ? (
              <>Record the fulfillment details for {itemCount} selected incentive{itemCount > 1 ? 's' : ''}.</>
            ) : (
              <>Record the fulfillment details for this {formatCurrency(amount || 0, currency)} incentive.</>
            )}
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
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!fulfillmentMethod.trim() || isSubmitting}
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Mark as Sent
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
