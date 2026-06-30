'use client'

import { useMemo, useState } from 'react'
import { useSWRConfig } from 'swr'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { Loader2, Lock } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { toast } from '@/components/ui/sonner'
import { formatCurrency } from '@/lib/utils'

export interface CheckoutInfo {
  clientSecret: string
  publishableKey: string | null
  amount: number | null
  totalAmount: number | null
  currency: string
  recurringInterval: string | null
  isPaymentRequired: boolean
  seats?: number | null
  productName: string | null
  customerEmail: string | null
}

function Row({ label, value, bold, muted }: { label: string; value: string; bold?: boolean; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={muted ? 'text-muted-foreground' : 'text-foreground'}>{label}</span>
      <span className={bold ? 'font-semibold' : muted ? 'text-muted-foreground' : 'text-foreground'}>{value}</span>
    </div>
  )
}

/**
 * Custom 2-column checkout in our design system. Left = order summary; right =
 * email + Stripe PaymentElement (the only PCI-safe card field). Confirms via our
 * /confirm route (Polar clientConfirm) + handles 3-D Secure.
 */
export function CustomCheckout({
  open,
  onOpenChange,
  info,
  planLabel,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  info: CheckoutInfo | null
  planLabel: string
  onSuccess?: () => void
}) {
  const publishableKey = info?.publishableKey ?? null
  const stripePromise = useMemo(() => (publishableKey ? loadStripe(publishableKey) : null), [publishableKey])
  const theme: 'stripe' | 'night' =
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark') ? 'night' : 'stripe'

  const amount = info?.totalAmount ?? info?.amount ?? 0
  const currency = info?.currency ?? 'usd'
  // Setup mode (SetupIntent) only when Polar requires no immediate charge.
  // Paid subscriptions need 'subscription' mode (PaymentIntent for the first invoice).
  const setupOnly = info ? info.isPaymentRequired === false : false

  const elementsOptions = setupOnly
    ? ({ mode: 'setup', currency, paymentMethodCreation: 'manual', appearance: { theme } } as const)
    : ({ mode: 'subscription', amount, currency, paymentMethodCreation: 'manual', appearance: { theme } } as const)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl overflow-hidden p-0 duration-300 ease-out data-open:slide-in-from-bottom-2 data-closed:slide-out-to-bottom-2">
        <DialogTitle className="sr-only">Checkout</DialogTitle>
        <div className="grid md:grid-cols-[1fr_1.15fr]">
          {/* Order summary */}
          <div className="border-b bg-muted/40 p-6 md:border-b-0 md:border-r">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Subscribing to</p>
            <p className="mt-1 text-lg font-semibold">{info?.productName ?? planLabel ?? 'Plan'}</p>
            <div className="mt-6 space-y-2 text-sm">
              {info?.seats ? <Row label="Seats" value={String(info.seats)} /> : null}
              <Row label="Subtotal" value={formatCurrency(info?.amount ?? amount, currency)} />
              <Row label="Tax" value="Calculated at payment" muted />
              <Separator className="my-2" />
              <Row
                label="Total"
                value={`${formatCurrency(amount, currency)}${info?.recurringInterval ? `/${info.recurringInterval === 'year' ? 'yr' : 'mo'}` : ''}`}
                bold
              />
            </div>
            <p className="mt-6 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Lock className="h-3 w-3" /> Secure payment · cancel anytime
            </p>
          </div>

          {/* Payment */}
          <div className="p-6">
            <h2 className="text-base font-semibold">Payment details</h2>
            <p className="mb-4 text-sm text-muted-foreground">Enter your card to start your subscription.</p>
            {!info || !stripePromise ? (
              <div className="space-y-3">
                <div className="h-10 w-full animate-pulse rounded-md bg-muted" />
                <div className="h-28 w-full animate-pulse rounded-md bg-muted" />
                <div className="h-10 w-full animate-pulse rounded-md bg-muted" />
              </div>
            ) : (
              <Elements stripe={stripePromise} options={elementsOptions}>
                <PayForm
                  info={info}
                  amount={amount}
                  currency={currency}
                  onSuccess={() => {
                    onOpenChange(false)
                    onSuccess?.()
                  }}
                />
              </Elements>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function PayForm({
  info,
  amount,
  currency,
  onSuccess,
}: {
  info: CheckoutInfo
  amount: number
  currency: string
  onSuccess: () => void
}) {
  const stripe = useStripe()
  const elements = useElements()
  const { mutate } = useSWRConfig()
  const [email, setEmail] = useState(info.customerEmail ?? '')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!stripe || !elements) return
    setBusy(true)
    setErr(null)
    try {
      const { error: subErr } = await elements.submit()
      if (subErr) {
        setErr(subErr.message ?? 'Please check your card details')
        setBusy(false)
        return
      }
      const { confirmationToken, error: tokErr } = await stripe.createConfirmationToken({ elements })
      if (tokErr || !confirmationToken) {
        setErr(tokErr?.message ?? 'Could not process your card')
        setBusy(false)
        return
      }
      // Polar requires the billing address (at least country) on confirm — pull it
      // from the billing details the PaymentElement captured.
      const billing = (confirmationToken as unknown as { payment_method_preview?: { billing_details?: { name?: string | null; address?: Record<string, string | null> } } })
        .payment_method_preview?.billing_details
      const a = billing?.address ?? {}
      if (!a.country) {
        setErr('Please select your country.')
        setBusy(false)
        return
      }
      const res = await fetch('/api/billing/polar/confirm', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientSecret: info.clientSecret,
          confirmationTokenId: confirmationToken.id,
          email,
          billingName: billing?.name ?? null,
          billingAddress: {
            country: a.country,
            line1: a.line1 ?? null,
            line2: a.line2 ?? null,
            city: a.city ?? null,
            state: a.state ?? null,
            postalCode: a.postal_code ?? null,
          },
        }),
      })
      const data = (await res.json().catch(() => ({}))) as { status?: string; piClientSecret?: string; error?: string }
      if (!res.ok) {
        setErr(data?.error ?? 'Payment failed')
        setBusy(false)
        return
      }
      // 3-D Secure: complete any required authentication.
      if (data.status !== 'confirmed' && data.piClientSecret) {
        const { error: naErr } = await stripe.handleNextAction({ clientSecret: data.piClientSecret })
        if (naErr) {
          setErr(naErr.message ?? 'Card authentication failed')
          setBusy(false)
          return
        }
      }
      // Revalidate the org list so the sidebar plan card + badge reflect the new
      // plan immediately (the confirm route already updated the DB synchronously).
      void mutate('/api/organizations')
      toast.success('Subscription activated')
      onSuccess()
    } catch {
      setErr('Payment could not be completed. Please try again.')
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="ck-email">Email</Label>
        <Input
          id="ck-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
        />
      </div>
      <PaymentElement options={{ layout: 'tabs' }} />
      {err && <p className="text-sm text-destructive">{err}</p>}
      <Button type="submit" className="w-full" disabled={!stripe || busy}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : `Subscribe · ${formatCurrency(amount, currency)}`}
      </Button>
    </form>
  )
}
