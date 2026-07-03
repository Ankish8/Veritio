'use client'

import { useEffect, useMemo, useState } from 'react'
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
import { SWR_KEYS } from '@/lib/swr'
import { formatCurrency } from '@/lib/utils'
import { celebrate } from '@/lib/confetti'
import type { PlanId } from '@/lib/plans'

export interface CheckoutInfo {
  clientSecret: string
  publishableKey: string | null
  amount: number | null
  totalAmount: number | null
  discountAmount?: number | null
  currency: string
  recurringInterval: string | null
  isPaymentRequired: boolean
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
 * One-time lifetime-deal checkout in our design system. Forked from CustomCheckout
 * (the recurring subscription checkout) so live billing is untouched. Differences:
 * Stripe Elements runs in 'payment' mode (one-time) instead of 'subscription', copy
 * reflects a single lifetime purchase, and there is no discount-code field — the
 * lifetime price is the deal, so stacked codes are intentionally not accepted.
 * Confirms via the shared /confirm route (Polar clientConfirm), which grants the
 * lifetime plan.
 */
export function LtdCheckout({
  open,
  onOpenChange,
  info,
  orgId,
  plan,
  planLabel,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  info: CheckoutInfo | null
  /** Org to grant on payment; null = anonymous payment-first purchase (claimed after signup). */
  orgId: string | null
  plan: PlanId
  planLabel: string
  onSuccess?: () => void
}) {
  const [liveInfo, setLiveInfo] = useState<CheckoutInfo | null>(info)

  useEffect(() => {
    setLiveInfo(info)
  }, [info])

  const publishableKey = liveInfo?.publishableKey ?? null
  const stripePromise = useMemo(() => (publishableKey ? loadStripe(publishableKey) : null), [publishableKey])
  const theme: 'stripe' | 'night' =
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark') ? 'night' : 'stripe'

  const amount = liveInfo?.totalAmount ?? liveInfo?.amount ?? 0
  const currency = liveInfo?.currency ?? 'usd'

  const elementsOptions = {
    mode: 'payment',
    amount,
    currency,
    paymentMethodCreation: 'manual',
    appearance: { theme },
  } as const

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* md:max-w-4xl overrides the base DialogContent's md:max-w-[calc(100%-2rem)]
          (a responsive variant that otherwise beats a plain max-w-* at desktop),
          so this stays a centered ~896px modal instead of near-full-width. */}
      <DialogContent className="max-w-3xl md:max-w-4xl overflow-hidden p-0 duration-300 ease-out data-open:slide-in-from-bottom-2 data-closed:slide-out-to-bottom-2">
        <DialogTitle className="sr-only">Lifetime deal checkout</DialogTitle>
        <div className="grid md:grid-cols-[1fr_1.15fr]">
          {/* Order summary */}
          <div className="border-b bg-muted/40 p-6 md:border-b-0 md:border-r">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Lifetime deal</p>
            <p className="mt-1 text-lg font-semibold">{liveInfo?.productName ?? planLabel ?? 'Lifetime plan'}</p>
            <div className="mt-6 space-y-2 text-sm">
              <Row label="Subtotal" value={formatCurrency(liveInfo?.amount ?? amount, currency)} />
              <Row label="Tax" value="Calculated at payment" muted />
              <Separator className="my-2" />
              <Row label="Total (one-time)" value={formatCurrency(amount, currency)} bold />
            </div>

            <p className="mt-6 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Lock className="h-3 w-3" /> Secure payment · pay once, yours for life
            </p>
          </div>

          {/* Payment */}
          <div className="p-6">
            <h2 className="text-base font-semibold">Payment details</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Enter your card to complete your one-time purchase.
            </p>
            {!liveInfo || !stripePromise ? (
              <div className="space-y-3">
                <div className="h-10 w-full animate-pulse rounded-md bg-muted" />
                <div className="h-28 w-full animate-pulse rounded-md bg-muted" />
                <div className="h-10 w-full animate-pulse rounded-md bg-muted" />
              </div>
            ) : (
              <Elements
                stripe={stripePromise}
                options={elementsOptions}
                // Remount if the total changes so Stripe always sees a consistent amount.
                key={`pay-${amount}`}
              >
                <PayForm
                  info={liveInfo}
                  amount={amount}
                  currency={currency}
                  orgId={orgId}
                  plan={plan}
                  onSuccess={() => {
                    // Notify the parent BEFORE the close callback so a payment-first
                    // launcher can flip to its success screen without a dismiss race.
                    onSuccess?.()
                    onOpenChange(false)
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
  orgId,
  plan,
  onSuccess,
}: {
  info: CheckoutInfo
  amount: number
  currency: string
  orgId: string | null
  plan: PlanId
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
      // Complete any required card authentication (3-D Secure / RBI e-mandate).
      // No-op when nothing is required.
      if (data.piClientSecret) {
        const { error: naErr } = await stripe.handleNextAction({ clientSecret: data.piClientSecret })
        if (naErr) {
          setErr(naErr.message ?? 'Card authentication failed')
          setBusy(false)
          return
        }
      } else if (data.status !== 'confirmed') {
        setErr(`Payment didn't complete (status: ${data.status ?? 'unknown'}). Please try again.`)
        setBusy(false)
        return
      }
      // Org purchases: optimistically flip the org to the lifetime plan in the
      // org-list cache, then revalidate (the confirm route already updated it).
      // Anonymous purchases have no org yet — the claim happens after signup.
      if (orgId) {
        void mutate(
          SWR_KEYS.organizations,
          (orgs: unknown) =>
            Array.isArray(orgs)
              ? orgs.map((o) =>
                  (o as { id?: string })?.id === orgId
                    ? { ...(o as object), plan, plan_status: 'active', trial_ends_at: null }
                    : o,
                )
              : orgs,
          { revalidate: true },
        )
      }
      void celebrate()
      toast.success(orgId ? 'Lifetime access unlocked' : 'Payment received')
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
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : amount > 0 ? (
          `Pay ${formatCurrency(amount, currency)} once`
        ) : (
          'Unlock lifetime access'
        )}
      </Button>
    </form>
  )
}
